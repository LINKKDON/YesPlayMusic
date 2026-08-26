import request from '@/utils/request';
import { mapTrackPlayableStatus } from '@/utils/common';

/**
 * 搜索
 * 说明 : 调用此接口 , 传入搜索关键词可以搜索该音乐 / 专辑 / 歌手 / 歌单 / 用户 , 关键词可以多个 , 以空格隔开 ,
 * 如 " 周杰伦 搁浅 "( 不需要登录 ), 搜索获取的 mp3url 不能直接用 , 可通过 /song/url 接口传入歌曲 id 获取具体的播放链接
 * - keywords : 关键词
 * - limit : 返回数量 , 默认为 30
 * - offset : 偏移数量，用于分页 , 如 : 如 :( 页数 -1)*30, 其中 30 为 limit 的值 , 默认为 0
 * - type: 搜索类型；默认为 1 即单曲 , 取值意义 : 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频, 1018:综合
 * - 调用例子 : /search?keywords=海阔天空 /cloudsearch?keywords=海阔天空(更全)
 * @param {Object} params
 * @param {string} params.keywords
 * @param {number=} params.limit
 * @param {number=} params.offset
 * @param {number=} params.type
 */
export function search(params) {
  return request({
    url: '/search',
    method: 'get',
    params,
  }).then(data => {
    if (data.result?.song !== undefined)
      data.result.song.songs = mapTrackPlayableStatus(data.result.song.songs);
    return data;
  });
}

export function personalFM() {
  return request({
    url: '/personal_fm',
    method: 'get',
    params: {
      timestamp: new Date().getTime(),
    },
  });
}

export function fmTrash(id) {
  return request({
    url: '/fm_trash',
    method: 'post',
    params: {
      timestamp: new Date().getTime(),
      id,
    },
  });
}

/**
 * 获取广告激励免费听权益状态。
 * 当前 API 上游未实现该端点时，调用方应将 404 视为能力不可用。
 */
export function getListeningRights() {
  return request({
    url: '/ad/listening/rights',
    method: 'get',
  });
}

/**
 * 获取广告接口需要的易盾反作弊 token。
 */
export function registerAdCheckToken() {
  return request({
    url: '/register/checktoken/v3',
    method: 'get',
    params: {
      refresh: 1,
    },
  });
}

/**
 * 获取激励广告，并从 Enhanced API 的响应中读取 reqId。
 */
export function getListeningRightsAd() {
  return request({
    url: '/ad/get',
    method: 'get',
  });
}

/**
 * 领取广告下发的免费听或其他权益。
 * @param {string} reqUid 广告请求 ID，由 /ad/get 返回。
 */
export function gainListeningRights(reqUid) {
  return request({
    url: '/ad/listening/rights/gain',
    method: 'get',
    params: {
      reqUid,
    },
  });
}

/**
 * 执行完整的广告权益领取流程：刷新反作弊 token、获取广告请求 ID、领取权益。
 */
export async function claimListeningRights() {
  const tokenResult = await registerAdCheckToken();
  if (!tokenResult?.token) {
    throw new Error('反作弊 Token 获取失败，请稍后重试');
  }

  const adResult = await getListeningRightsAd();
  const reqUid = adResult?.extra?.reqId;
  if (adResult?.code !== 200 || !reqUid) {
    throw new Error('未获取到可用广告权益，请稍后重试');
  }

  const gainResult = await gainListeningRights(reqUid);
  if (gainResult?.code !== 200) {
    throw new Error(gainResult?.message || gainResult?.msg || '权益领取失败');
  }

  return gainResult;
}
