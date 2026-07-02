/** Minimal TypeScript declarations for Adobe CEP CSInterface.js (v11). */

declare class CSInterface {
  getSystemPath(pathType: string): string
  evalScript(script: string, callback?: (result: string) => void): void
  addEventListener(type: string, listener: (event: CSEvent) => void): void
  removeEventListener(type: string, listener: (event: CSEvent) => void): void
  setPanelFlyoutMenu(menuXML: string): void
  openURLInDefaultBrowser(url: string): void
  closeExtension(): void
}

declare interface CSEvent {
  type: string
  scope: string
  appId: string
  extensionId: string
  data: string
}

declare const SystemPath: {
  readonly EXTENSION: string
  readonly USER_DATA: string
}

interface Window {
  CSInterface: typeof CSInterface
  SystemPath: typeof SystemPath
  __adobe_cep__?: unknown
}
