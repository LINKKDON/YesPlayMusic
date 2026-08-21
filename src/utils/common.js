import { isAccountLoggedIn } from './auth';
import { refreshCookie } from '@/api/auth';
import dayjs from 'dayjs';
import store from '@/store';

export function isTrackPlayable(track) {
  let result = {
    playable: true,
    reason: '',
  };
  const privilege = track.privilege || {};

  // 有播放权限（pl>0）或云盘资源 -> 可播放
  if (privilege.pl > 0 || privilege.cs) {
    return result;
  }

  // 无版权：任何登录态都不可播（任何音源都放不了）
  if (track.noCopyrightRcmd !== null && track.noCopyrightRcmd !== undefined) {
    result.playable = false;
    result.reason = '无版权';
    return result;
  }

  // 已下架：仅登录态可判定
  if (privilege.st < 0 && isAccountLoggedIn()) {
    result.playable = false;
    result.reason = '已下架';
    return result;
  }

  // VIP / 付费内容：
  //   会员（vipType>0）：官方音源直接可播 -> 可播
  //   登录非会员：仅当开启第三方音源回退才可播；关闭回退时按上游逻辑置灰
  //   未登录：置灰
  const isVip = store.state.data?.user?.vipType > 0;
  const canPlayRestrictedContent =
    isVip ||
    (isAccountLoggedIn() &&
      store.state.settings?.enableThirdPartySource === true);

  if (privilege.fee === 1 || track.fee === 1) {
    return canPlayRestrictedContent
      ? result
      : { playable: false, reason: 'VIP Only' };
  }
  if (privilege.fee === 4 || track.fee === 4) {
    return canPlayRestrictedContent
      ? result
      : { playable: false, reason: '付费专辑' };
  }
  if (privilege.fee === 16 || track.fee === 16) {
    return canPlayRestrictedContent
      ? result
      : { playable: false, reason: '付费单曲' };
  }

  return result;
}

export function mapTrackPlayableStatus(tracks, privileges = []) {
  if (tracks?.length === undefined) return tracks;

  // 统一对所有歌曲执行权限判断（不再因登录态强制全部可播）
  return tracks.map(t => {
    const privilege = privileges.find(item => item.id === t.id) || {};
    if (t.privilege) {
      Object.assign(t.privilege, privilege);
    } else {
      t.privilege = privilege;
    }
    const result = isTrackPlayable(t);
    t.playable = result.playable;
    t.reason = result.reason;
    return t;
  });
}

export function randomNum(minNum, maxNum) {
  switch (arguments.length) {
    case 1:
      return parseInt(Math.random() * minNum + 1, 10);
    case 2:
      return parseInt(Math.random() * (maxNum - minNum + 1) + minNum, 10);
    default:
      return 0;
  }
}

export function shuffleAList(list) {
  let sortsList = list.map(t => t.sort);
  for (let i = 1; i < sortsList.length; i++) {
    const random = Math.floor(Math.random() * (i + 1));
    [sortsList[i], sortsList[random]] = [sortsList[random], sortsList[i]];
  }
  let newSorts = {};
  list.map(track => {
    newSorts[track.id] = sortsList.pop();
  });
  return newSorts;
}

export function throttle(fn, time) {
  let isRun = false;
  return function () {
    if (isRun) return;
    isRun = true;
    fn.apply(this, arguments);
    setTimeout(() => {
      isRun = false;
    }, time);
  };
}

export function updateHttps(url) {
  if (!url) return '';
  return url.replace(/^http:/, 'https:');
}

export function dailyTask() {
  let lastDate = store.state.data.lastRefreshCookieDate;
  if (
    isAccountLoggedIn() &&
    (lastDate === undefined || lastDate !== dayjs().date())
  ) {
    console.debug('[debug][common.js] execute dailyTask');
    refreshCookie().then(() => {
      console.debug('[debug][common.js] 刷新cookie');
      store.commit('updateData', {
        key: 'lastRefreshCookieDate',
        value: dayjs().date(),
      });
    });
  }
}

export function changeAppearance(appearance) {
  if (appearance === 'auto' || appearance === undefined) {
    appearance = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  document.body.setAttribute('data-theme', appearance);
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute('content', appearance === 'dark' ? '#222' : '#fff');
}

export function splitSoundtrackAlbumTitle(title) {
  let keywords = [
    'Music from the Original Motion Picture Score',
    'The Original Motion Picture Soundtrack',
    'Original MGM Motion Picture Soundtrack',
    'Complete Original Motion Picture Score',
    'Original Music From The Motion Picture',
    'Music From The Disney+ Original Movie',
    'Original Music From The Netflix Film',
    'Original Score to the Motion Picture',
    'Original Motion Picture Soundtrack',
    'Soundtrack from the Motion Picture',
    'Original Television Soundtrack',
    'Original Motion Picture Score',
    'Music From the Motion Picture',
    'Music From The Motion Picture',
    'Complete Motion Picture Score',
    'Music from the Motion Picture',
    'Original Videogame Soundtrack',
    'La Bande Originale du Film',
    'Music from the Miniseries',
    'Bande Originale du Film',
    'Die Original Filmmusik',
    'Original Soundtrack',
    'Complete Score',
    'Original Score',
  ];
  for (let keyword of keywords) {
    if (title.includes(keyword) === false) continue;
    return {
      title: title
        .replace(`(${keyword})`, '')
        .replace(`: ${keyword}`, '')
        .replace(`[${keyword}]`, '')
        .replace(`- ${keyword}`, '')
        .replace(`${keyword}`, ''),
      subtitle: keyword,
    };
  }
  return {
    title: title,
    subtitle: '',
  };
}

export function splitAlbumTitle(title) {
  let keywords = [
    'Bonus Tracks Edition',
    'Complete Edition',
    'Deluxe Edition',
    'Deluxe Version',
    'Tour Edition',
  ];
  for (let keyword of keywords) {
    if (title.includes(keyword) === false) continue;
    return {
      title: title
        .replace(`(${keyword})`, '')
        .replace(`: ${keyword}`, '')
        .replace(`[${keyword}]`, '')
        .replace(`- ${keyword}`, '')
        .replace(`${keyword}`, ''),
      subtitle: keyword,
    };
  }
  return {
    title: title,
    subtitle: '',
  };
}

export function bytesToSize(bytes) {
  let marker = 1024; // Change to 1000 if required
  let decimal = 2; // Change as required
  let kiloBytes = marker;
  let megaBytes = marker * marker;
  let gigaBytes = marker * marker * marker;

  let lang = store.state.settings.lang;

  if (bytes < kiloBytes) return bytes + (lang === 'en' ? ' Bytes' : '字节');
  else if (bytes < megaBytes)
    return (bytes / kiloBytes).toFixed(decimal) + ' KB';
  else if (bytes < gigaBytes)
    return (bytes / megaBytes).toFixed(decimal) + ' MB';
  else return (bytes / gigaBytes).toFixed(decimal) + ' GB';
}

export function formatTrackTime(value) {
  if (!value) return '';
  let min = ~~(value / 60);
  let sec = (~~(value % 60)).toString().padStart(2, '0');
  return `${min}:${sec}`;
}
