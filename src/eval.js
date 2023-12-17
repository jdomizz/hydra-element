/**
 * Evaluates code using destructured attributes of a hydra-synth instance
 * @param {string} code The code to eval
 * @param {*} synth The instance of the hydra-synth
 * @param {boolean} log Whether to log destructured attributes
 */
export function hydraEval(code, synth, log = false) {

    const {
      // synth settings
      render,
      update,
      setResolution,
      hush,
      setFunction,
      speed,
      bpm,
      width,
      height,
      time,
      mouse,
      stats,
      // default outputs
      o0,
      o1,
      o2,
      o3,
      // default sources
      s0,
      s1,
      s2,
      s3,
      // source generators
      noise,
      voronoi,
      osc,
      shape,
      gradient,
      src,
      solid,
      prev,
      // utils
      a,
      screencap,
      vidRecorder
    } = synth
  
    // NOTE: avoids treeshaking
    if (log) {
      console.log(render)
      console.log(update)
      console.log(setResolution)
      console.log(hush)
      console.log(setFunction)
      console.log(speed)
      console.log(bpm)
      console.log(width)
      console.log(height)
      console.log(time)
      console.log(mouse)
      console.log(stats)
      console.log(o0)
      console.log(o1)
      console.log(o2)
      console.log(o3)
      console.log(s0)
      console.log(s1)
      console.log(s2)
      console.log(s3)
      console.log(noise)
      console.log(voronoi)
      console.log(osc)
      console.log(shape)
      console.log(gradient)
      console.log(src)
      console.log(solid)
      console.log(prev)
      console.log(a)
      console.log(screencap)
      console.log(vidRecorder)
    }
  
    eval(code)
  
  }
  