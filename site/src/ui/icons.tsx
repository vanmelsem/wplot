import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function TreeChevronIcon(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 8 8" aria-hidden="true">
      <path d="M2.5 1.5 5.5 4 2.5 6.5" />
    </svg>
  )
}

export function FolderIcon(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M1.5 3.5h3l1 1h5v4.5a1 1 0 0 1-1 1h-8z" />
      <path d="M1.5 3.5v-1h3.25l1 1" />
    </svg>
  )
}

export function FileIcon(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3 1.75h4.25L9 3.5v6.75H3z" />
      <path d="M7.25 1.75V3.5H9" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 8 8" aria-hidden="true">
      <path d="M0.75 0.75 7.25 7.25M7.25 0.75 0.75 7.25" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 10 10" aria-hidden="true">
      <path d="M5 1.5v7M1.5 5h7" />
    </svg>
  )
}

export function MaximizeIcon(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 4V2h2M6 2h2v2M8 6v2H6M4 8H2V6" />
    </svg>
  )
}

export function RestoreIcon(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 10 10" aria-hidden="true">
      <path d="M3.5 1.5h5v5h-2M1.5 3.5h5v5h-5z" />
    </svg>
  )
}
