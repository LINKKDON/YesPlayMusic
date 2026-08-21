const { contextBridge, ipcRenderer } = require('electron');

const sendChannels = new Set([
  'close',
  'minimize',
  'maximizeOrUnmaximize',
  'settings',
  'playDiscordPresence',
  'pauseDiscordPresence',
  'setProxy',
  'removeProxy',
  'switchGlobalShortcutStatusTemporary',
  'updateShortcut',
  'restoreDefaultShortcuts',
  'updateTrayTooltip',
  'updateTrayPlayState',
  'updateTrayLikeState',
  'updateTrayIcon',
  'player',
  'metadata',
  'playerCurrentTrackTime',
  'seeked',
  'switchRepeatMode',
  'switchShuffle',
  'sendLyrics',
  'showMessageBox',
]);

const receiveChannels = new Set([
  'changeRouteTo',
  'search',
  'play',
  'next',
  'previous',
  'increaseVolume',
  'decreaseVolume',
  'like',
  'repeat',
  'shuffle',
  'routerGo',
  'nextUp',
  'rememberCloseAppOption',
  'setPosition',
  'isMaximized',
  'saveLyricFinished',
]);

function subscribe(channel, listener, once = false) {
  if (!receiveChannels.has(channel) || typeof listener !== 'function') {
    return () => {};
  }

  const wrappedListener = (_event, ...args) => listener(...args);
  if (once) {
    ipcRenderer.once(channel, wrappedListener);
  } else {
    ipcRenderer.on(channel, wrappedListener);
  }

  return () => ipcRenderer.removeListener(channel, wrappedListener);
}

contextBridge.exposeInMainWorld(
  'electronAPI',
  Object.freeze({
    platform: process.platform,
    send(channel, ...args) {
      if (sendChannels.has(channel)) ipcRenderer.send(channel, ...args);
    },
    on(channel, listener) {
      return subscribe(channel, listener);
    },
    once(channel, listener) {
      return subscribe(channel, listener, true);
    },
    showMessageBox(message) {
      if (typeof message === 'string' && message.length > 0) {
        ipcRenderer.send('showMessageBox', message);
      }
    },
  })
);
