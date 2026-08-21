/**
 * Returns an alert-like function that fits the current runtime environment.
 *
 * Electron uses the preload bridge so the renderer never receives direct
 * access to the dialog module.
 *
 * @returns {(message: string) => void}
 */
const nativeAlert = message => {
  if (process.env.IS_ELECTRON === true && window.electronAPI) {
    window.electronAPI.showMessageBox(message);
    return;
  }
  alert(message);
};

export default nativeAlert;