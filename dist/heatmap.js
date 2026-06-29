var A=[[68,1,84],[72,21,103],[72,38,119],[69,55,129],[63,71,136],[57,86,140],[50,100,142],[45,113,142],[40,125,142],[35,138,141],[31,150,139],[32,163,134],[41,175,127],[60,187,117],[86,198,103],[117,208,84],[152,216,62],[190,223,38],[223,227,24],[253,231,37]];function D(e,t){let i=t<=0?0:t>=1?1:t,a=e.length-1,s=i*a,l=Math.min(a,Math.floor(s)),u=Math.min(a,l+1),n=s-l,r=e[l],o=e[u];return[Math.round(r[0]+(o[0]-r[0])*n),Math.round(r[1]+(o[1]-r[1])*n),Math.round(r[2]+(o[2]-r[2])*n),255]}var v=e=>D(A,e),E=e=>{let t=Math.round((e<=0?0:e>=1?1:e)*255);return[t,t,t,255]};function S(e,t=256){let i=new Uint8Array(t*4),a=t>1?t-1:1;for(let s=0;s<t;s+=1){let[l,u,n,r]=e(s/a),o=s*4;i[o]=l,i[o+1]=u,i[o+2]=n,i[o+3]=r}return i}function x(e,t){let i=t(e.x0,e.y0),a=t(e.x1,e.y1),s=Math.min(i.x,a.x),l=Math.max(i.x,a.x),u=Math.min(i.y,a.y),n=Math.max(i.y,a.y);return{left:s,top:u,right:l,bottom:n,width:l-s,height:n-u}}function y(e,t,i){let a=t===void 0,s=i===void 0,l=a?1/0:t,u=s?-1/0:i;if(a||s)for(let n=0;n<e.length;n+=1){let r=e[n];Number.isFinite(r)&&(a&&r<l&&(l=r),s&&r>u&&(u=r))}return Number.isFinite(l)||(l=0),Number.isFinite(u)||(u=l+1),u<=l&&(u=l+1),{min:l,max:u}}function P(e,t,i,a,s){let l=a.max-a.min||1,u=t*i,n=new Uint8ClampedArray(u*4);for(let r=0;r<u;r+=1){let o=(e[r]-a.min)/l,[f,g,m,p]=s(o),c=r*4;n[c]=f,n[c+1]=g,n[c+2]=m,n[c+3]=p}return n}function B(e){let t=parseFloat(e.style.width),i=parseFloat(e.style.height),a=Number.isFinite(t)&&t>0?t:e.clientWidth,s=Number.isFinite(i)&&i>0?i:e.clientHeight;return{w:Math.max(1,Math.round(a)),h:Math.max(1,Math.round(s))}}function h(e,t){let{w:i,h:a}=B(e),s=t>0?t:1,l=Math.max(1,Math.round(i*s)),u=Math.max(1,Math.round(a*s));return e.width!==l&&(e.width=l),e.height!==u&&(e.height=u),{cssW:i,cssH:a,deviceW:l,deviceH:u}}function w(e){let t=y(e.values,e.valueMin,e.valueMax),i=e.colormap??v,a=(e.sampling??"nearest")==="linear",s=null,l=null,u=!1;function n(){if(s||u)return s;if(typeof document>"u"||e.cols<=0||e.rows<=0)return u=!0,null;let r=P(e.values,e.rows,e.cols,t,i),o=document.createElement("canvas");o.width=e.cols,o.height=e.rows;let f=o.getContext("2d");return f?(f.putImageData(new ImageData(r,e.cols,e.rows),0,0),s=o,s):(u=!0,null)}return{draw(r){let o=r.canvas,{cssW:f,cssH:g}=h(o,r.dpr),m=l??(l=o.getContext("2d"));if(!m)return;m.setTransform(r.dpr,0,0,r.dpr,0,0),m.clearRect(0,0,f,g);let p=n();if(!p)return;let c=x(e,r.valueToPx);if(c.width<=0||c.height<=0)return;let b=r.bounds;m.save(),m.beginPath(),m.rect(b.origin.x,b.origin.y,b.size.width,b.size.height),m.clip(),m.imageSmoothingEnabled=a,m.drawImage(p,c.left,c.top,c.width,c.height),m.restore()}}}function R(){return typeof navigator<"u"&&!!navigator.gpu}var F=!1;function I(e){F||(F=!0,typeof console<"u"&&typeof console.warn=="function"&&console.warn(`[wplot/heatmap] WebGPU unavailable (${e}); using Canvas-2D fallback.`))}var N=`
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
`;async function O(e,t){let i=navigator.gpu;if(!i)throw new Error("no navigator.gpu");let a=await i.requestAdapter();if(!a)throw new Error("no adapter");let s=(t.sampling??"nearest")==="linear",l=a.features.has("float32-filterable"),u=s&&l,n=await a.requestDevice(u?{requiredFeatures:["float32-filterable"]}:{}),r=e.getContext("webgpu");if(!r)throw new Error("no webgpu context");let o=i.getPreferredCanvasFormat();r.configure({device:n,format:o,alphaMode:"premultiplied"});let f=y(t.values,t.valueMin,t.valueMax),g=t.colormap??v,m=n.createTexture({size:{width:t.cols,height:t.rows},format:"r32float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});n.queue.writeTexture({texture:m},t.values,{bytesPerRow:t.cols*4,rowsPerImage:t.rows},{width:t.cols,height:t.rows});let p=256,c=n.createTexture({size:{width:p,height:1},format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST});n.queue.writeTexture({texture:c},S(g,p),{bytesPerRow:p*4,rowsPerImage:1},{width:p,height:1});let b=n.createSampler(u?{magFilter:"linear",minFilter:"linear"}:{magFilter:"nearest",minFilter:"nearest"}),d=n.createSampler({magFilter:"linear",minFilter:"linear"}),G=n.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:u?"float":"unfilterable-float"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{type:u?"filtering":"non-filtering"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}}]}),M=n.createShaderModule({code:N}),L=n.createRenderPipeline({layout:n.createPipelineLayout({bindGroupLayouts:[G]}),vertex:{module:M,entryPoint:"vs"},fragment:{module:M,entryPoint:"fs",targets:[{format:o}]},primitive:{topology:"triangle-list"}}),C=new Float32Array(12),T=n.createBuffer({size:C.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),U=n.createBindGroup({layout:G,entries:[{binding:0,resource:{buffer:T}},{binding:1,resource:m.createView()},{binding:2,resource:b},{binding:3,resource:c.createView()},{binding:4,resource:d}]});return{device:n,context:r,pipeline:L,bindGroup:U,uniformBuffer:T,uniformData:C}}function H(e,t){let i=y(e.values,e.valueMin,e.valueMax),a=null,s=!1,l=!1,u=null;function n(r){s||(s=!0,O(r,e).then(o=>{a=o,t?.()}).catch(o=>{l=!0,I(o instanceof Error?o.message:String(o)),t?.()}))}return{draw(r){if(l){u||(u=w(e)),u.draw(r);return}n(r.canvas);let o=a;if(!o)return;let{deviceW:f,deviceH:g}=h(r.canvas,r.dpr),m=r.dpr>0?r.dpr:1,p=x(e,r.valueToPx),c=o.uniformData;c[0]=p.left*m,c[1]=p.top*m,c[2]=p.width*m||1,c[3]=p.height*m||1,c[4]=r.bounds.origin.x*m,c[5]=r.bounds.origin.y*m,c[6]=r.bounds.size.width*m,c[7]=r.bounds.size.height*m,c[8]=i.min,c[9]=i.max,c[10]=0,c[11]=0,o.device.queue.writeBuffer(o.uniformBuffer,0,c);let b=o.device.createCommandEncoder(),d=b.beginRenderPass({colorAttachments:[{view:o.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"}]});d.setPipeline(o.pipeline),d.setBindGroup(0,o.bindGroup),d.draw(3),d.end(),o.device.queue.submit([b.finish()])}}}function ee(e,t={}){return{name:"heatmap",setup(i){let a=!t.forceCanvas2d&&R()?H(e,()=>i.redraw()):w(e);return i.addLayer(a)}}}export{S as buildColormapLut,P as buildRgbaGrid,E as grayscale,ee as heatmap,y as inferValueRange,R as isWebgpuAvailable,x as projectDataRect,v as viridis};
