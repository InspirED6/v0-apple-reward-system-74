declare module "quagga" {
  export interface InputStreamConfig {
    type: string
    constraints?: Record<string, any>
    target?: HTMLElement | HTMLVideoElement | string
  }

  export interface DecoderConfig {
    workers?: number
    debug?: boolean
  }

  export interface LocatorConfig {
    patchSize?: string
    halfSample?: boolean
  }

  export interface QuaggaConfig {
    inputStream: InputStreamConfig
    decoder?: DecoderConfig
    locator?: LocatorConfig
    numOfWorkers?: number
    frequency?: number
  }

  export interface CodeResult {
    code: string
  }

  export interface DetectionResult {
    codeResult?: CodeResult
  }

  const Quagga: {
    init: (config: QuaggaConfig, callback: (err: any) => void) => void
    start: () => void
    stop: () => void
    onDetected: (callback: (result: DetectionResult) => void) => void
    offDetected: () => void
  }

  export default Quagga
}
