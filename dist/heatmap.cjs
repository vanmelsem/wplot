"use strict";var G=Object.defineProperty;var E=Object.getOwnPropertyDescriptor;var B=Object.getOwnPropertyNames;var I=Object.prototype.hasOwnProperty;var N=(e,t)=>{for(var n in t)G(e,n,{get:t[n],enumerable:!0})},O=(e,t,n,o)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of B(t))!I.call(e,i)&&i!==n&&G(e,i,{get:()=>t[i],enumerable:!(o=E(t,i))||o.enumerable});return e};var W=e=>O(G({},"__esModule",{value:!0}),e);var X={};N(X,{buildColormapLut:()=>h,buildRgbaGrid:()=>w,grayscale:()=>H,heatmap:()=>Y,inferValueRange:()=>d,isWebgpuAvailable:()=>R,projectDataRect:()=>x,viridis:()=>v});module.exports=W(X);var z=[[68,1,84],[72,21,103],[72,38,119],[69,55,129],[63,71,136],[57,86,140],[50,100,142],[45,113,142],[40,125,142],[35,138,141],[31,150,139],[32,163,134],[41,175,127],[60,187,117],[86,198,103],[117,208,84],[152,216,62],[190,223,38],[223,227,24],[253,231,37]];function V(e,t){let n=t<=0?0:t>=1?1:t,o=e.length-1,i=n*o,l=Math.min(o,Math.floor(i)),s=Math.min(o,l+1),a=i-l,r=e[l],u=e[s];return[Math.round(r[0]+(u[0]-r[0])*a),Math.round(r[1]+(u[1]-r[1])*a),Math.round(r[2]+(u[2]-r[2])*a),255]}var v=e=>V(z,e),H=e=>{let t=Math.round((e<=0?0:e>=1?1:e)*255);return[t,t,t,255]};function h(e,t=256){let n=new Uint8Array(t*4),o=t>1?t-1:1;for(let i=0;i<t;i+=1){let[l,s,a,r]=e(i/o),u=i*4;n[u]=l,n[u+1]=s,n[u+2]=a,n[u+3]=r}return n}function x(e,t){let n=t(e.x0,e.y0),o=t(e.x1,e.y1),i=Math.min(n.x,o.x),l=Math.max(n.x,o.x),s=Math.min(n.y,o.y),a=Math.max(n.y,o.y);return{left:i,top:s,right:l,bottom:a,width:l-i,height:a-s}}function d(e,t,n){let o=t===void 0,i=n===void 0,l=o?1/0:t,s=i?-1/0:n;if(o||i)for(let a=0;a<e.length;a+=1){let r=e[a];Number.isFinite(r)&&(o&&r<l&&(l=r),i&&r>s&&(s=r))}return Number.isFinite(l)||(l=0),Number.isFinite(s)||(s=l+1),s<=l&&(s=l+1),{min:l,max:s}}function w(e,t,n,o,i){let l=o.max-o.min||1,s=t*n,a=new Uint8ClampedArray(s*4);for(let r=0;r<s;r+=1){let u=(e[r]-o.min)/l,[f,g,m,p]=i(u),c=r*4;a[c]=f,a[c+1]=g,a[c+2]=m,a[c+3]=p}return a}function _(e){let t=parseFloat(e.style.width),n=parseFloat(e.style.height),o=Number.isFinite(t)&&t>0?t:e.clientWidth,i=Number.isFinite(n)&&n>0?n:e.clientHeight;return{w:Math.max(1,Math.round(o)),h:Math.max(1,Math.round(i))}}function S(e,t){let{w:n,h:o}=_(e),i=t>0?t:1,l=Math.max(1,Math.round(n*i)),s=Math.max(1,Math.round(o*i));return e.width!==l&&(e.width=l),e.height!==s&&(e.height=s),{cssW:n,cssH:o,deviceW:l,deviceH:s}}function P(e){let t=d(e.values,e.valueMin,e.valueMax),n=e.colormap??v,o=(e.sampling??"nearest")==="linear",i=null,l=null,s=!1;function a(){if(i||s)return i;if(typeof document>"u"||e.cols<=0||e.rows<=0)return s=!0,null;let r=w(e.values,e.rows,e.cols,t,n),u=document.createElement("canvas");u.width=e.cols,u.height=e.rows;let f=u.getContext("2d");return f?(f.putImageData(new ImageData(r,e.cols,e.rows),0,0),i=u,i):(s=!0,null)}return{draw(r){let u=r.canvas,{cssW:f,cssH:g}=S(u,r.dpr),m=l??(l=u.getContext("2d"));if(!m)return;m.setTransform(r.dpr,0,0,r.dpr,0,0),m.clearRect(0,0,f,g);let p=a();if(!p)return;let c=x(e,r.valueToPx);if(c.width<=0||c.height<=0)return;let b=r.bounds;m.save(),m.beginPath(),m.rect(b.origin.x,b.origin.y,b.size.width,b.size.height),m.clip(),m.imageSmoothingEnabled=o,m.drawImage(p,c.left,c.top,c.width,c.height),m.restore()}}}function R(){return typeof navigator<"u"&&!!navigator.gpu}var L=!1;function q(e){L||(L=!0,typeof console<"u"&&typeof console.warn=="function"&&console.warn(`[wplot/heatmap] WebGPU unavailable (${e}); using Canvas-2D fallback.`))}var k=`
struct Uniforms {
  rect : vec4<f32>,
  bounds : vec4<f32>,
  range : vec4<f32>,
};
@group(0) @binding(0) var<uniform> u : Uniforms;
@group(0) @binding(1) var valueTex : texture_2d<f32>;
@group(0) @binding(2) var valueSamp : sampler;
@group(0) @binding(3) var lutTex : texture_2d<f32>;
@group(0) @binding(4) var lutSamp : sampler;

struct VsOut {
  @builtin(position) pos : vec4<f32>,
};

@vertex
fn vs(@builtin(vertex_index) vi : u32) -> VsOut {
  var corners = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0),
  );
  var out : VsOut;
  out.pos = vec4<f32>(corners[vi], 0.0, 1.0);
  return out;
}

@fragment
fn fs(@builtin(position) frag : vec4<f32>) -> @location(0) vec4<f32> {
  let px = frag.x;
  let py = frag.y;
  var visible = true;
  if (px < u.bounds.x || px > u.bounds.x + u.bounds.z ||
      py < u.bounds.y || py > u.bounds.y + u.bounds.w) {
    visible = false;
  }
  let uu = (px - u.rect.x) / u.rect.z;
  let vv = (py - u.rect.y) / u.rect.w;
  if (uu < 0.0 || uu > 1.0 || vv < 0.0 || vv > 1.0) {
    visible = false;
  }
  if (!visible) {
    discard;
  }
  let raw = textureSample(valueTex, valueSamp, vec2<f32>(uu, vv)).r;
  let span = max(u.range.y - u.range.x, 1e-20);
  let t = clamp((raw - u.range.x) / span, 0.0, 1.0);
  return textureSample(lutTex, lutSamp, vec2<f32>(t, 0.5));
}
`;async function j(e,t){let n=navigator.gpu;if(!n)throw new Error("no navigator.gpu");let o=await n.requestAdapter();if(!o)throw new Error("no adapter");let i=(t.sampling??"nearest")==="linear",l=o.features.has("float32-filterable"),s=i&&l,a=await o.requestDevice(s?{requiredFeatures:["float32-filterable"]}:{}),r=e.getContext("webgpu");if(!r)throw new Error("no webgpu context");let u=n.getPreferredCanvasFormat();r.configure({device:a,format:u,alphaMode:"premultiplied"});let f=d(t.values,t.valueMin,t.valueMax),g=t.colormap??v,m=a.createTexture({size:{width:t.cols,height:t.rows},format:"r32float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});a.queue.writeTexture({texture:m},t.values,{bytesPerRow:t.cols*4,rowsPerImage:t.rows},{width:t.cols,height:t.rows});let p=256,c=a.createTexture({size:{width:p,height:1},format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});a.queue.writeTexture({texture:c},h(g,p),{bytesPerRow:p*4,rowsPerImage:1},{width:p,height:1});let b=a.createSampler(s?{magFilter:"linear",minFilter:"linear"}:{magFilter:"nearest",minFilter:"nearest"}),y=a.createSampler({magFilter:"linear",minFilter:"linear"}),M=a.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:s?"float":"unfilterable-float"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:s?"filtering":"non-filtering"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}}]}),C=a.createShaderModule({code:k}),A=a.createRenderPipeline({layout:a.createPipelineLayout({bindGroupLayouts:[M]}),vertex:{module:C,entryPoint:"vs"},fragment:{module:C,entryPoint:"fs",targets:[{format:u}]},primitive:{topology:"triangle-list"}}),T=new Float32Array(12),F=a.createBuffer({size:T.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),D=a.createBindGroup({layout:M,entries:[{binding:0,resource:{buffer:F}},{binding:1,resource:m.createView()},{binding:2,resource:b},{binding:3,resource:c.createView()},{binding:4,resource:y}]});return{device:a,context:r,pipeline:A,bindGroup:D,uniformBuffer:F,uniformData:T}}function U(e,t){let n=d(e.values,e.valueMin,e.valueMax),o=null,i=!1,l=!1,s=null;function a(r){i||(i=!0,j(r,e).then(u=>{o=u,t?.()}).catch(u=>{l=!0,q(u instanceof Error?u.message:String(u)),t?.()}))}return{draw(r){if(l){s||(s=P(e)),s.draw(r);return}a(r.canvas);let u=o;if(!u)return;let{deviceW:f,deviceH:g}=S(r.canvas,r.dpr),m=r.dpr>0?r.dpr:1,p=x(e,r.valueToPx),c=u.uniformData;c[0]=p.left*m,c[1]=p.top*m,c[2]=p.width*m||1,c[3]=p.height*m||1,c[4]=r.bounds.origin.x*m,c[5]=r.bounds.origin.y*m,c[6]=r.bounds.size.width*m,c[7]=r.bounds.size.height*m,c[8]=n.min,c[9]=n.max,c[10]=0,c[11]=0,u.device.queue.writeBuffer(u.uniformBuffer,0,c);let b=u.device.createCommandEncoder(),y=b.beginRenderPass({colorAttachments:[{view:u.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"}]});y.setPipeline(u.pipeline),y.setBindGroup(0,u.bindGroup),y.draw(3),y.end(),u.device.queue.submit([b.finish()])}}}function Y(e,t={}){return{name:"heatmap",setup(n){let o=!t.forceCanvas2d&&R()?U(e,()=>n.redraw()):P(e);return n.addLayer(o)}}}
