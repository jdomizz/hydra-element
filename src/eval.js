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
  
    // NOTE: for some reason I can't destructure loadScript from synth
    const loadScript = (url = "") => new Promise((resolve, reject) => {
      const script = document.createElement("script")
      script.onload = () => resolve()
      script.onerror = () => reject()
      script.src = url
      document.head.appendChild(script)
    })

    // NOTE: quick & dirty trick to avoid treeshaking
    if (log) {
      console.log(
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
        o0,
        o1,
        o2,
        o3,
        s0,
        s1,
        s2,
        s3,
        noise,
        voronoi,
        osc,
        shape,
        gradient,
        src,
        solid,
        prev,
        a,
        screencap,
        vidRecorder,
        loadScript,
      )
    }
  
    eval(code)
  
  }
  