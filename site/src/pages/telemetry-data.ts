import { clamp, prng, randn, pulse, smoothSamples } from './theme'

// Synthetic rocket-engine telemetry, ported from the vanilla demo. A seeded PRNG
// drives a small physical model (operating phases, slewed actuators, thermal
// breathing, a wear-driven "degradation window") so the traces look like real
// hot-fire data and stay identical across reloads.

export const SAMPLE_RATE_HZ = 60
export const SAMPLE_STEP_MS = 1000 / SAMPLE_RATE_HZ
const DURATION_MINUTES = 12
export const TOTAL_SAMPLES = SAMPLE_RATE_HZ * 60 * DURATION_MINUTES
export const TOTAL_DURATION_MS = (TOTAL_SAMPLES - 1) * SAMPLE_STEP_MS
export const INITIAL_WINDOW_MS = 4 * 60 * 1000
export const TIME_OFFSET_MS = Date.now() - TOTAL_DURATION_MS
export const DEG_START_MS = TOTAL_DURATION_MS * 0.61
export const DEG_END_MS = TOTAL_DURATION_MS * 0.79

export type DenseTelemetry = {
  x: Float64Array
  processX: Float64Array
  chamberTarget: Float32Array
  chamberActual: Float32Array
  throttleCmd: Float32Array
  throttleFeedback: Float32Array
  throttleError: Float32Array
  pumpLoad: Float32Array
  mixtureRatio: Float32Array
}

export function buildDenseTelemetry(): DenseTelemetry {
  const rand = prng(20_260_325)
  const x = new Float64Array(TOTAL_SAMPLES)
  const chamberTarget = new Float32Array(TOTAL_SAMPLES)
  const chamberActual = new Float32Array(TOTAL_SAMPLES)
  const throttleCmd = new Float32Array(TOTAL_SAMPLES)
  const throttleFeedback = new Float32Array(TOTAL_SAMPLES)
  const throttleError = new Float32Array(TOTAL_SAMPLES)
  const pumpLoad = new Float32Array(TOTAL_SAMPLES)
  const mixtureRatio = new Float32Array(TOTAL_SAMPLES)
  const processX: number[] = []
  const processPump: number[] = []
  const processMix: number[] = []
  let processCount = 0
  let processTimeSum = 0
  let processPumpSum = 0
  let processMixSum = 0

  const operatingPhases = [
    { durationSec: 18, pc: 0, throttle: 0, pump: 2.498, mix: 2.507 },
    { durationSec: 10, pc: 34, throttle: 6, pump: 2.499, mix: 2.507 },
    { durationSec: 10, pc: 86, throttle: 12, pump: 2.5, mix: 2.506 },
    { durationSec: 8, pc: 128, throttle: 18, pump: 2.501, mix: 2.505 },
    { durationSec: 14, pc: 210, throttle: 34, pump: 2.503, mix: 2.505 },
    { durationSec: 24, pc: 282, throttle: 56, pump: 2.506, mix: 2.506 },
    { durationSec: 18, pc: 294, throttle: 58, pump: 2.507, mix: 2.507 },
    { durationSec: 14, pc: 318, throttle: 64, pump: 2.508, mix: 2.508 },
    { durationSec: 18, pc: 304, throttle: 60, pump: 2.507, mix: 2.509 },
    { durationSec: 20, pc: 346, throttle: 84, pump: 2.51, mix: 2.511 },
    { durationSec: 16, pc: 238, throttle: 64, pump: 2.506, mix: 2.51 },
    { durationSec: 12, pc: 248, throttle: 62, pump: 2.505, mix: 2.508 },
    { durationSec: 12, pc: 102, throttle: 24, pump: 2.5, mix: 2.504 },
    { durationSec: 10, pc: 0, throttle: 0, pump: 2.499, mix: 2.503 },
  ] as const
  const cyclePressureTrim = [0, 8, -4, 12]
  const cycleThrottleTrim = [0, 2, -1, 3]
  const cyclePumpTrim = [0, 0.0018, -0.0012, 0.0024]
  const cycleMixTrim = [0, 0.0012, -0.0014, 0.0018]
  let regimeIndex = 0
  let nextRegime = 0
  let throttleTarget = 0
  let chamberTargetCmd = 0
  let pumpTargetBase = 2.498
  let mixTargetBase = 2.507
  let throttleCmdState = 0
  let throttleFbState = 0
  let chamberActualState = 0
  let pumpState = 2.498
  let mixtureState = 2.507
  let commandNoise = 0
  let valveNoise = 0
  let chamberNoise = 0
  let pumpNoise = 0
  let mixtureNoise = 0
  let pressureEdge = 0
  let pumpEdge = 0
  let throttleEdge = 0

  const DEG_START = TOTAL_DURATION_MS * 0.61
  const DEG_END = TOTAL_DURATION_MS * 0.79

  for (let i = 0; i < TOTAL_SAMPLES; i += 1) {
    const tMs = i * SAMPLE_STEP_MS
    const tSec = tMs / 1000
    x[i] = tMs

    if (i >= nextRegime) {
      const phaseIndex = regimeIndex % operatingPhases.length
      const cycle = Math.floor(regimeIndex / operatingPhases.length)
      const phase = operatingPhases[phaseIndex]!
      const nextThrottleTarget = clamp(
        phase.throttle + cycleThrottleTrim[cycle % cycleThrottleTrim.length]!,
        0,
        88,
      )
      const nextChamberTarget = clamp(
        phase.pc + cyclePressureTrim[cycle % cyclePressureTrim.length]!,
        0,
        390,
      )
      const nextPumpTarget =
        phase.pump + cyclePumpTrim[cycle % cyclePumpTrim.length]!
      const nextMixTarget =
        phase.mix + cycleMixTrim[cycle % cycleMixTrim.length]!
      throttleEdge += (nextThrottleTarget - throttleTarget) * 0.16
      pressureEdge += (nextChamberTarget - chamberTargetCmd) * 0.018
      pumpEdge += (nextPumpTarget - pumpTargetBase) * 0.6
      throttleTarget = nextThrottleTarget
      chamberTargetCmd = nextChamberTarget
      pumpTargetBase = nextPumpTarget
      mixTargetBase = nextMixTarget
      nextRegime =
        i +
        Math.floor(
          SAMPLE_RATE_HZ * (phase.durationSec + (rand() - 0.5) * 2.4),
        )
      regimeIndex += 1
    }

    const degraded = tMs >= DEG_START && tMs <= DEG_END
    const thermalBreathing =
      Math.sin(tSec / 210) * 0.58 + Math.cos(tSec / 79) * 0.22
    const feedSystemBias =
      Math.sin(tSec / 260) * 0.0012 + Math.cos(tSec / 113) * 0.00045
    const chamberBias =
      Math.sin(tSec / 155) * 0.42 + Math.cos(tSec / 51) * 0.16
    const pumpWearEnvelope = degraded
      ? 0.0016 + Math.max(0, Math.sin(tSec / 33)) * 0.0009
      : Math.max(0, Math.sin(tSec / 58)) * 0.00028
    const pumpThermal =
      Math.sin(tSec / 340) * 0.0022 + Math.cos(tSec / 190) * 0.0009
    const mixtureTrim =
      Math.sin(tSec / 124) * 0.00085 + Math.cos(tSec / 46) * 0.00028
    const mixtureThermal =
      Math.sin(tSec / 300 + 0.4) * 0.0018 + Math.cos(tSec / 170) * 0.0007
    const valveChatter =
      pulse(tSec, 142, 1.6, 5.4) +
      pulse(tSec, 303, 1.2, -4.2) +
      pulse(tSec, 517, 1.0, 6.8)
    const pumpDip = pulse(tSec, 206, 8, -0.0032) + pulse(tSec, 562, 10, -0.0064)
    const mixtureBias =
      pulse(tSec, 425, 20, 0.0018) + pulse(tSec, 615, 14, -0.0012)
    commandNoise = commandNoise * 0.92 + randn(rand) * 0.04
    throttleEdge *= 0.86
    throttleCmdState +=
      (throttleTarget - throttleCmdState) * (degraded ? 0.032 : 0.072)
    throttleCmdState +=
      throttleEdge * 0.22 + commandNoise * 0.18 + thermalBreathing * 0.04
    throttleCmdState = clamp(throttleCmdState, 0, 92)

    valveNoise = valveNoise * 0.9 + randn(rand) * 0.055
    const feedbackLag = degraded ? -3.1 : -0.2
    throttleFbState +=
      (throttleCmdState + feedbackLag - throttleFbState) *
      (degraded ? 0.014 : 0.052)
    throttleFbState +=
      valveNoise * 0.18 + valveChatter * 0.12 + thermalBreathing * 0.03
    throttleFbState = clamp(throttleFbState, 0, 92)

    const error =
      (throttleCmdState - throttleFbState) * 1.1 +
      valveNoise * 1.3 +
      valveChatter * 0.45

    chamberNoise = chamberNoise * 0.94 + randn(rand) * 0.24
    pressureEdge *= 0.91
    const chamberSlew = degraded ? 0.016 : 0.04
    chamberActualState += (chamberTargetCmd - chamberActualState) * chamberSlew
    chamberActualState +=
      pressureEdge * 0.55 +
      chamberNoise +
      (throttleCmdState - throttleFbState) * 0.06 +
      chamberBias
    if (degraded) chamberActualState -= 0.26 + thermalBreathing * 0.08
    chamberActualState = clamp(chamberActualState, 0, 392)

    const pumpTarget =
      pumpTargetBase +
      pumpThermal +
      (chamberActualState - chamberTargetCmd) * 0.00002 +
      pumpDip +
      feedSystemBias * 0.45 +
      pumpWearEnvelope
    pumpNoise = pumpNoise * 0.975 + randn(rand) * 0.00005
    pumpEdge *= 0.9
    pumpState +=
      (pumpTarget - pumpState) * (degraded ? 0.016 : 0.024) +
      pumpNoise +
      pumpEdge * 0.035

    const mixtureTarget =
      mixTargetBase +
      mixtureThermal +
      (degraded ? 0.0024 : 0.0006) +
      mixtureBias +
      (throttleCmdState - throttleFbState) * 0.00005 -
      feedSystemBias * 0.35 +
      mixtureTrim +
      (pumpState - pumpTargetBase) * 0.18
    mixtureNoise = mixtureNoise * 0.978 + randn(rand) * 0.00008
    mixtureState +=
      (mixtureTarget - mixtureState) * (degraded ? 0.022 : 0.034) + mixtureNoise

    chamberTarget[i] = chamberTargetCmd
    chamberActual[i] = chamberActualState
    throttleCmd[i] = throttleCmdState
    throttleFeedback[i] = throttleFbState
    throttleError[i] = error
    pumpLoad[i] = pumpState
    mixtureRatio[i] = mixtureState

    processCount += 1
    processTimeSum += tMs
    processPumpSum += pumpState
    processMixSum += mixtureState

    if (processCount === 120 || i === TOTAL_SAMPLES - 1) {
      processX.push(processTimeSum / processCount)
      processPump.push(processPumpSum / processCount)
      processMix.push(processMixSum / processCount)
      processCount = 0
      processTimeSum = 0
      processPumpSum = 0
      processMixSum = 0
    }
  }

  return {
    x,
    processX: Float64Array.from(processX),
    chamberTarget,
    chamberActual,
    throttleCmd,
    throttleFeedback,
    throttleError,
    pumpLoad: smoothSamples(processPump, 0.22),
    mixtureRatio: smoothSamples(processMix, 0.18),
  }
}
