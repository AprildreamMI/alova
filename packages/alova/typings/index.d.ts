import { EventManager } from '@alova/shared/createEventManager';
import { Writable } from 'svelte/store';
import { Ref } from 'vue';

type Replace<T1, T2> = Omit<T1, keyof T2> & T2;
export interface AlovaGenerics<S = any, C = any, W = any, E = any, R = any, T = any, RC = any, RE = any, RH = any> {
  State: S;
  Computed: C;
  Watched: W;
  Export: E;
  Responded: R;
  Transformed: T;
  RequestConfig: RC;
  Response: RE;
  ResponseHeader: RH;
}

type Arg = Record<string, any>;
export type RequestBody = Arg | string | FormData | Blob | ArrayBuffer | URLSearchParams | ReadableStream;

/** 进度信息 */
export type Progress = {
  total: number;
  loaded: number;
};

/**
 * 请求要素，发送请求必备的信息
 */
export interface RequestElements {
  readonly url: string;
  readonly type: MethodType;
  readonly headers: Arg;
  readonly data?: RequestBody;
}
export type ProgressUpdater = (total: number, loaded: number) => void;
export type AlovaRequestAdapter<RequestConfig, Response, ResponseHeader> = (
  elements: RequestElements,
  method: Method<AlovaGenerics<any, any, any, any, any, any, RequestConfig, Response, ResponseHeader>>
) => {
  response: () => Promise<Response>;
  headers: () => Promise<ResponseHeader>;
  onDownload?: (handler: ProgressUpdater) => void;
  onUpload?: (handler: ProgressUpdater) => void;
  abort: () => void;
};

export interface FetchRequestState<L = any, E = any, D = any, U = any> {
  loading: L;
  error: E;
  downloading: D;
  uploading: U;
}
export interface FrontRequestState<L = any, R = any, E = any, D = any, U = any> extends FetchRequestState<L, E, D, U> {
  data: R;
}
export type MethodType = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH';

/**
 * provide user to custom some types
 * 1. meta: custom metadata type.
 * 2. statesHook: custom the global states hook type.
 */
interface AlovaCustomTypes {}

export interface DefaultCacheEvent {
  type: 'set' | 'get' | 'remove' | 'clear';
  key: string;
  value?: any;
  container: Record<string, any>;
}
export interface AlovaGlobalCacheAdapter {
  /**
   * save or update cache
   * @param key key
   * @param value value
   */
  set(key: string, value: any): void | Promise<void>;

  /**
   * get value by key
   * @param key key
   */
  get<T>(key: string): T | undefined | Promise<T | undefined>;

  /**
   * remove item
   * @param key key
   */
  remove(key: string): void | Promise<void>;

  /**
   * clear all cache.
   */
  clear(): void | Promise<void>;

  /**
   * the events related to cache operating emitter.
   */
  readonly emitter?: EventManager<{ success: DefaultCacheEvent; fail: Omit<DefaultCacheEvent, 'value'> }>;
}

/**
 * 请求缓存设置
 * expire: 过期时间
 *  1. 当设置为数字时：如果大于0则首先返回缓存数据，过期时间单位为毫秒，小于等于0不缓存，Infinity为永不过期；
 *  2. 当设置为Date对象时，表示
 * mode: 缓存模式，可选值为memory、restore
 */
export type CacheExpire = number | Date | null;
export type CacheMode = 'memory' | 'restore';
export type DetailCacheConfig = {
  expire: CacheExpire;
  mode?: CacheMode;

  /** 持久化缓存标签，标签改变后原有持久化数据将会失效 */
  tag?: string | number;
};
export type CacheConfig = CacheExpire | DetailCacheConfig;
export type CacheController<Responded> = () => Responded | undefined | Promise<Responded | undefined>;
export interface MethodRequestConfig {
  /**
   * url参数
   */
  params: Arg;

  /**
   * 请求头
   */
  headers: Arg;
}
export type AlovaMethodConfig<Responded, Transformed, RequestConfig, ResponseHeader> = {
  /**
   * method对象名称，在updateState、invalidateCache、setCache、以及fetch函数中可以通过名称或通配符获取对应method对象
   */
  name?: string | number;

  /**
   * 当前中断时间
   */
  timeout?: number;

  /**
   * 响应数据在缓存时间内则不再次请求。get请求默认缓存5分钟（300000毫秒），其他请求默认不缓存
   */
  cacheFor?: CacheConfig | CacheController<Responded>;

  /**
   * 打击源方法实例，当源方法实例请求成功时，当前方法实例的缓存将被失效
   * 作为自动失效功能，只需设置打击源即可，而不需要手动调用invalidateCache失效缓存
   * 同时，此功能在错综复杂的失效关系中比invalidateCache方法更简洁
   * 该字段值可设置为method实例、其他method实例的name、name正则匹配，或者它们的数组
   */
  hitSource?: string | RegExp | Method | (string | RegExp | Method)[];

  /**
   * 响应数据转换，转换后的数据将转换为data状态，没有转换数据则直接用响应数据作为data状态
   */
  transformData?: (data: Transformed, headers: ResponseHeader) => Responded | Promise<Responded>;

  /**
   * 请求级共享请求开关
   * 开启共享请求后，同时发起相同请求时将共用同一个请求
   * 当这边设置后将覆盖全局的设置
   */
  shareRequest?: boolean;

  /**
   * method元数据
   */
  meta?: AlovaCustomTypes['meta'];
} & RequestConfig;
export type AlovaMethodCreateConfig<Responded, Transformed, RequestConfig, ResponseHeader> = Partial<MethodRequestConfig> &
  AlovaMethodConfig<Responded, Transformed, RequestConfig, ResponseHeader>;

export type RespondedHandler<AG extends AlovaGenerics> = (response: Response, methodInstance: Method<AG>) => any;
export type ResponseErrorHandler<AG extends AlovaGenerics> = (error: any, methodInstance: Method<AG>) => void | Promise<void>;
export type ResponseCompleteHandler<AG extends AlovaGenerics> = (methodInstance: Method<AG>) => any;
export type RespondedHandlerRecord<AG extends AlovaGenerics> = {
  /**
   * 全局的请求成功钩子函数
   * 如果在全局onSuccess中抛出错误不会触发全局onError，而是会触发请求位置的onError
   */
  onSuccess?: RespondedHandler<AG>;

  /**
   * 全局的请求错误钩子函数，请求错误是指网络请求失败，服务端返回404、500等错误代码不会进入此钩子函数
   * 当指定了全局onError捕获错误时，如果没有抛出错误则会触发请求位置的onSuccess
   */
  onError?: ResponseErrorHandler<AG>;

  /**
   * 请求完成钩子函数
   * 请求成功、缓存匹配成功、请求失败都将触发此钩子函数
   */
  onComplete?: ResponseCompleteHandler<AG>;
};

export const enum EnumHookType {
  USE_REQUEST = 1,
  USE_WATCHER = 2,
  USE_FETCHER = 3
}
export interface Hook {
  /** 最后一次请求的method实例 */
  m?: Method;

  /** saveStatesFns */
  sf: ((frontStates: FrontRequestState) => void)[];

  /** removeStatesFns */
  rf: (() => void)[];

  /** frontStates */
  fs: FrontRequestState;

  /**
   * update states.
   */
  upd: (newStates: Record<string, any>, targetStates?: Record<string, any>) => void;

  /** event manager */
  em: EventManager<{
    success: AlovaSuccessEvent<any>;
    error: AlovaErrorEvent<any>;
    complete: AlovaCompleteEvent<any>;
  }>;

  /** hookType, useRequest=1, useWatcher=2, useFetcher=3 */
  ht: EnumHookType;

  /** hook config */
  c: UseHookConfig<any>;

  /** refering object */
  ro: ReferingObject;

  /** enableDownload */
  ed: boolean;

  /** enableUpload */
  eu: boolean;
}
export interface EffectRequestParams<E> {
  handler: (...args: any[]) => void;
  removeStates: () => void;
  saveStates: (frontStates: FrontRequestState) => void;
  frontStates: FrontRequestState;
  watchingStates?: E[];
  immediate: boolean;
}

export type ReferingObject = Record<any, any>;
export interface StatesHook<State, Computed, Watched = State | Computed, Export = State> {
  /**
   * 创建状态
   * @param initialValue 初始数据
   * @returns 状态值
   */
  create: (initialValue: any, referingObject: ReferingObject, isRef?: boolean) => State;

  /**
   * create computed state
   * @param initialValue initial data
   * @param referingObject refering object
   */
  computed: (getter: () => any, deps: Export[], referingObject: ReferingObject, isRef?: boolean) => Computed;

  /**
   * 导出给开发者使用的值
   * @param state 状态值
   * @param referingObject refering object
   * @returns 导出的值
   */
  export?: (state: State, referingObject: ReferingObject) => Export;

  /** 将状态转换为普通数据 */
  dehydrate: (state: State, key: string, referingObject: ReferingObject) => any;

  /**
   * 更新状态值
   * @param newVal 新的数据集合
   * @param state 原状态值
   * @param @param referingObject refering object
   */
  update: (newVal: Record<string, any>, state: Record<string, State>, referingObject: ReferingObject) => void;

  /**
   * 控制执行请求的函数，此函数将在useRequest、useWatcher被调用时执行一次
   * 在useFetcher中的fetch函数中执行一次
   * 当watchingStates为空数组时，执行一次handleRequest函数
   * 当watchingStates为非空数组时，当状态变化时调用，immediate为true时，需立即调用一次
   * hook是use hook的实例，每次use hook调用时都将生成一个hook实例
   * 在vue中直接执行即可，而在react中需要在useEffect中执行
   * removeStates函数为清除当前状态的函数，应该在组件卸载时调用
   */
  effectRequest: (effectParams: EffectRequestParams<any>, referingObject: ReferingObject) => void;

  /**
   * 包装send、abort等use hooks操作函数
   * 这主要用于优化在react中，每次渲染都会生成新函数的问题，优化性能
   * @param fn use hook操作函数
   * @returns 包装后的操作函数
   */
  memorize?: <Callback extends (...args: any[]) => any>(fn: Callback) => Callback;

  /**
   * 创建引用对象
   * @param initialValue 初始值
   * @returns 包含初始值的引用对象
   */
  ref?: <D>(initialValue: D) => { current: D };

  /**
   * watch states
   * @param source watching source
   * @param callback callback when states changes
   * @param referingObject refering object
   */
  watch: (source: Watched[], callback: () => void, referingObject: ReferingObject) => void;

  /**
   * bind mounted callback.
   * @param callback callback on component mounted
   * @param referingObject refering object
   */
  onMounted: (callback: () => void, referingObject: ReferingObject) => void;

  /**
   * bind unmounted callback.
   * @param callback callback on component unmounted
   * @param referingObject refering object
   */
  onUnmounted: (callback: () => void, referingObject: ReferingObject) => void;
}

export type GlobalCacheConfig = Partial<Record<MethodType, CacheConfig>> | null;
export type CacheLoggerHandler<AG extends AlovaGenerics> = (
  response: any,
  methodInstance: Method<AG>,
  cacheMode: CacheMode,
  tag: DetailCacheConfig['tag']
) => void | Promise<void>;
/**
 * 泛型类型解释：
 * State: create函数创建的状态组的类型
 * Computed: computed函数创建的计算属性值
 * Watched: 监听器类型
 * Export: export函数返回的状态组的类型
 * RequestConfig: requestAdapter的请求配置类型，自动推断
 * Response: 类型requestAdapter的响应配置类型，自动推断
 * ResponseHeader: requestAdapter的响应头类型，自动推断
 */
export interface AlovaOptions<AG extends AlovaGenerics> {
  /**
   * custom alova id
   *
   * **Recommend to custom it in multiple server scenarios**
   * @default increme from 0 in creating order
   */
  id?: number | string;

  /**
   * base url
   */
  baseURL?: string;

  /**
   * 状态hook函数，用于定义和更新指定MVVM库的状态
   */
  statesHook?: StatesHook<AG['State'], AG['Computed'], AG['Watched'], AG['Export']>;

  /**
   * request adapter.
   * all request of alova will be sent by it.
   */
  requestAdapter: AlovaRequestAdapter<AG['RequestConfig'], AG['Response'], AG['ResponseHeader']>;

  /**
   * global timeout. unit is millisecond.
   */
  timeout?: number;

  /**
   * 全局的请求本地缓存设置
   * expire: 过期时间，如果大于0则首先返回缓存数据，过期时间单位为毫秒，小于等于0不缓存，Infinity为永不过期
   * mode: 缓存模式，可选值为memory、restore
   * get请求默认缓存5分钟（300000毫秒），其他请求默认不缓存
   * @default { GET: 300000 }
   */
  cacheFor?: GlobalCacheConfig;

  /**
   * memory mode cache adapter. it will be used when caching data with memory mode.
   * it's an js's object default.
   * you can set your own adapter with sync/async function of set/get/remove.
   * see [https://alova.js.org/tutorial/custom/custom-storage-adapter]
   */
  l1Cache?: AlovaGlobalCacheAdapter;

  /**
   * limitation of method snapshots.
   * it indicates not save snapshot when value is set to 0, and the method matcher will not work.
   * @default 1000
   */
  snapshots?: number;

  /**
   * restore mode cache adapter. it will be used when persist data.
   * default behavior:
   * - browser/deno: localStorage.
   * - nodejs/bun: no adapter.(you can use @alova/cache-file).
   * see [https://alova.js.org/tutorial/custom/custom-storage-adapter]
   */
  l2Cache?: AlovaGlobalCacheAdapter;

  /**
   * global before request hook
   */
  beforeRequest?: (method: Method<AG>) => void | Promise<void>;

  /**
   * 全局的响应钩子，可传一个也可以设置为带onSuccess,onError,onComplete的对象，表示请求成功和请求错误的钩子
   * 如果在全局onSuccess中抛出错误不会触发全局onError，而是会触发请求位置的onError
   * 当指定了全局onError捕获错误时，如果没有抛出错误则会触发请求位置的onSuccess
   * @version 2.1.0
   */
  responded?: RespondedHandler<AG> | RespondedHandlerRecord<AG>;

  /**
   * 全局的共享请求开关
   * 开启共享请求后，同时发起相同请求时将共用同一个请求
   * @default true
   */
  shareRequest?: boolean;

  /**
   * 缓存日志打印
   * 当命中响应缓存时将默认在控制台打印匹配的缓存信息，以提醒开发者
   * 设置为false、null值时将不打印日志
   * 设置为自定义函数时将自定义接管缓存匹配的任务
   * @version 2.8.0
   * @default true
   */
  cacheLogger?: boolean | null | CacheLoggerHandler<AG>;
}

export type ProgressHandler = (progress: Progress) => void;

export interface AbortFunction {
  (): void;
  a: () => void;
}

/**
 * 请求方法类型
 */
export interface Method<AG extends AlovaGenerics = AlovaGenerics> {
  /**
   * baseURL of alova instance
   */
  baseURL: string;
  /**
   * 请求地址
   */
  url: string;
  /**
   * 请求类型
   */
  type: MethodType;
  /**
   * method配置
   */
  config: MethodRequestConfig & AlovaMethodConfig<AG['Responded'], AG['Transformed'], AG['RequestConfig'], AG['ResponseHeader']>;
  /**
   * 请求体
   */
  data?: RequestBody;
  /**
   * 缓存打击源
   */
  hitSource?: (string | RegExp)[];
  /**
   * alova实例
   */
  context: Alova<AG>;

  /**
   * 存储临时的key
   */
  __key__: string;

  /**
   * 下载事件
   * @version 2.17.0
   */
  dhs: ProgressHandler[];

  /**
   * 上传事件
   * @version 2.17.0
   */
  uhs: ProgressHandler[];

  /**
   * 本次响应数据是否来自缓存
   * @version 2.17.0
   */
  fromCache: boolean | undefined;

  /**
   * 用于在全局的request和response钩子函数中传递额外信息所用
   * js项目中可使用任意字段
   */
  meta?: any;

  /**
   * 使用此method实例直接发送请求
   * @param forceRequest 强制请求
   * @returns 请求Promise实例
   */
  send(forceRequest?: boolean): Promise<AG['Responded']>;

  /**
   * 设置名称
   * @param name 名称
   */
  setName(name: string | number): void;

  /**
   * 中断此method实例直接发送的请求
   */
  abort: AbortFunction;

  /**
   * 绑定resolve和/或reject Promise的callback
   * @param onfullified resolve Promise时要执行的回调
   * @param onrejected 当Promise被reject时要执行的回调
   * @returns 返回一个Promise，用于执行任何回调
   */
  then<TResult1 = AG['Responded'], TResult2 = never>(
    onfulfilled?: (value: AG['Responded']) => TResult1 | PromiseLike<TResult1>,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2>;

  /**
   * 绑定一个仅用于reject Promise的回调
   * @param onrejected 当Promise被reject时要执行的回调
   * @returns 返回一个完成回调的Promise
   */
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ): Promise<AG['Responded'] | TResult>;

  /**
   * 绑定一个回调，该回调在Promise结算（resolve或reject）时调用
   * @param onfinally Promise结算（resolve或reject）时执行的回调。
   * @return 返回一个完成回调的Promise。
   */
  finally(onfinally?: (() => void) | undefined | null): Promise<AG['Responded']>;

  /**
   * 绑定下载进度回调函数
   * @param progressHandler 下载进度回调函数
   * @version 2.17.0
   * @return 解绑函数
   */
  onDownload(progressHandler: ProgressHandler): () => void;

  /**
   * 绑定上传进度回调函数
   * @param progressHandler 上传进度回调函数
   * @version 2.17.0
   * @return 解绑函数
   */
  onUpload(progressHandler: ProgressHandler): () => void;
}
export interface MethodConstructor {
  new <AG extends AlovaGenerics>(
    type: MethodType,
    context: Alova<AG>,
    url: string,
    config?: AlovaMethodCreateConfig<AG['Responded'], AG['Transformed'], AG['RequestConfig'], AG['ResponseHeader']>,
    data?: RequestBody
  ): Method<AG>;
  readonly prototype: Method;
}
// eslint-disable-next-line
export declare const Method: MethodConstructor;

export interface MethodSnapshotContainer<AG extends AlovaGenerics> {
  records: Record<string, Set<Method<AG>>>;
  capacity: number;
  occupy: number;
  save(methodInstance: Method<AG>): void;

  /**
   * get method snapshots by matcher
   * the method snapshots means the method instance that has been requested
   * @version 3.0.0
   * @param {MethodFilter} matcher method matcher
   * @param {boolean} matchAll is match all, default is true
   * @returns {Method[] | Method} method list when `matchAll` is true, otherwise return method instance or undefined
   */
  match<M extends boolean = true>(matcher: MethodFilter, matchAll?: M): M extends true ? Method<AG>[] : Method<AG> | undefined;
}

export interface Alova<AG extends AlovaGenerics> {
  id: string;
  options: AlovaOptions<AG>;
  l1Cache: AlovaGlobalCacheAdapter;
  l2Cache: AlovaGlobalCacheAdapter;
  snapshots: MethodSnapshotContainer<AG>;
  Get<Responded = unknown, Transformed = unknown>(
    url: string,
    config?: AlovaMethodCreateConfig<Responded, Transformed, AG['RequestConfig'], AG['ResponseHeader']>
  ): Method<
    AlovaGenerics<
      AG['State'],
      AG['Computed'],
      AG['Watched'],
      AG['Export'],
      Responded,
      Transformed,
      AG['RequestConfig'],
      AG['Response'],
      AG['ResponseHeader']
    >
  >;
  Post<Responded = unknown, Transformed = unknown>(
    url: string,
    data?: RequestBody,
    config?: AlovaMethodCreateConfig<Responded, Transformed, AG['RequestConfig'], AG['ResponseHeader']>
  ): Method<
    AlovaGenerics<
      AG['State'],
      AG['Computed'],
      AG['Watched'],
      AG['Export'],
      Responded,
      Transformed,
      AG['RequestConfig'],
      AG['Response'],
      AG['ResponseHeader']
    >
  >;
  Put<Responded = unknown, Transformed = unknown>(
    url: string,
    data?: RequestBody,
    config?: AlovaMethodCreateConfig<Responded, Transformed, AG['RequestConfig'], AG['ResponseHeader']>
  ): Method<
    AlovaGenerics<
      AG['State'],
      AG['Computed'],
      AG['Watched'],
      AG['Export'],
      Responded,
      Transformed,
      AG['RequestConfig'],
      AG['Response'],
      AG['ResponseHeader']
    >
  >;
  Delete<Responded = unknown, Transformed = unknown>(
    url: string,
    data?: RequestBody,
    config?: AlovaMethodCreateConfig<Responded, Transformed, AG['RequestConfig'], AG['ResponseHeader']>
  ): Method<
    AlovaGenerics<
      AG['State'],
      AG['Computed'],
      AG['Watched'],
      AG['Export'],
      Responded,
      Transformed,
      AG['RequestConfig'],
      AG['Response'],
      AG['ResponseHeader']
    >
  >;
  Put<Responded = unknown, Transformed = unknown>(
    url: string,
    data?: RequestBody,
    config?: AlovaMethodCreateConfig<Responded, Transformed, AG['RequestConfig'], AG['ResponseHeader']>
  ): Method<
    AlovaGenerics<
      AG['State'],
      AG['Computed'],
      AG['Watched'],
      AG['Export'],
      Responded,
      Transformed,
      AG['RequestConfig'],
      AG['Response'],
      AG['ResponseHeader']
    >
  >;
  Head<Responded = unknown, Transformed = unknown>(
    url: string,
    config?: AlovaMethodCreateConfig<Responded, Transformed, AG['RequestConfig'], AG['ResponseHeader']>
  ): Method<
    AlovaGenerics<
      AG['State'],
      AG['Computed'],
      AG['Watched'],
      AG['Export'],
      Responded,
      Transformed,
      AG['RequestConfig'],
      AG['Response'],
      AG['ResponseHeader']
    >
  >;
  Options<Responded = unknown, Transformed = unknown>(
    url: string,
    config?: AlovaMethodCreateConfig<Responded, Transformed, AG['RequestConfig'], AG['ResponseHeader']>
  ): Method<
    AlovaGenerics<
      AG['State'],
      AG['Computed'],
      AG['Watched'],
      AG['Export'],
      Responded,
      Transformed,
      AG['RequestConfig'],
      AG['Response'],
      AG['ResponseHeader']
    >
  >;
  Patch<Responded = unknown, Transformed = unknown>(
    url: string,
    data?: RequestBody,
    config?: AlovaMethodCreateConfig<Responded, Transformed, AG['RequestConfig'], AG['ResponseHeader']>
  ): Method<
    AlovaGenerics<
      AG['State'],
      AG['Computed'],
      AG['Watched'],
      AG['Export'],
      Responded,
      Transformed,
      AG['RequestConfig'],
      AG['Response'],
      AG['ResponseHeader']
    >
  >;
}

/**
 * alova base event
 */
export interface AlovaEvent<AG extends AlovaGenerics> {
  /**
   * params from send function
   */
  sendArgs: any[];
  /**
   * current method instance
   */
  method: Method<AG>;
}
/**
 * success event object
 */
export interface AlovaSuccessEvent<AG extends AlovaGenerics> extends AlovaEvent<AG> {
  /** data数据是否来自缓存 */
  fromCache: boolean;
  data: AG['Responded'];
}
/** 错误事件对象 */
export interface AlovaErrorEvent<AG extends AlovaGenerics> extends AlovaEvent<AG> {
  error: any;
}
/** 完成事件对象 */
export interface AlovaCompleteEvent<AG extends AlovaGenerics> extends AlovaEvent<AG> {
  /** 响应状态 */
  status: 'success' | 'error';
  /** data数据是否来自缓存，当status为error时，fromCache始终为false */
  fromCache: boolean;
  data?: AG['Responded'];
  error?: any;
}

export type SuccessHandler<AG extends AlovaGenerics> = (event: AlovaSuccessEvent<AG>) => void;
export type ErrorHandler<AG extends AlovaGenerics> = (event: AlovaErrorEvent<AG>) => void;
export type CompleteHandler<AG extends AlovaGenerics> = (event: AlovaCompleteEvent<AG>) => void;

export type FrontExportedUpdate<R> = (
  newFrontStates: Partial<FrontRequestState<boolean, R, Error | undefined, Progress, Progress>>
) => void;
export type FetcherExportedUpdate = (newFetcherStates: Partial<FetchRequestState<boolean, Error | undefined, Progress, Progress>>) => void;
export interface AlovaMiddlewareContext<AG extends AlovaGenerics> {
  /** 当前的method对象 */
  method: Method<AG>;

  /** 命中的缓存数据 */
  cachedResponse: AG['Responded'] | undefined;

  /** 当前的usehook配置对象 */
  config: any;

  /** 中断函数 */
  abort: UseHookReturnType['abort'];

  /** 成功回调装饰 */
  decorateSuccess: (decorator: (handler: SuccessHandler<AG>, event: AlovaSuccessEvent<AG>, index: number, length: number) => void) => void;

  /** 失败回调装饰 */
  decorateError: (decorator: (handler: ErrorHandler<AG>, event: AlovaErrorEvent<AG>, index: number, length: number) => void) => void;

  /** 完成回调装饰 */
  decorateComplete: (
    decorator: (handler: CompleteHandler<AG>, event: AlovaCompleteEvent<AG>, index: number, length: number) => void
  ) => void;
}

/**
 * useRequest和useWatcher中间件的context参数
 */
export interface AlovaFrontMiddlewareContext<AG extends AlovaGenerics> extends AlovaMiddlewareContext<AG> {
  /** 发送请求函数 */
  send: SendHandler<AG['Responded']>;

  /** sendArgs 响应处理回调的参数，该参数由use hooks的send传入 */
  sendArgs: any[];

  /** 前端状态集合 */
  frontStates: FrontRequestState<
    ExportedType<boolean, AG['State']>,
    ExportedType<AG['Responded'], AG['State']>,
    ExportedType<Error | undefined, AG['State']>,
    ExportedType<Progress, AG['State']>,
    ExportedType<Progress, AG['State']>
  >;

  /** 状态更新函数 */
  update: FrontExportedUpdate<AG['Responded']>;

  /**
   * 调用后将自定义控制loading的状态，内部不再触发loading状态的变更
   * 传入control为false时将取消控制
   *
   * @param control 是否控制loading，默认为true
   */
  controlLoading: (control?: boolean) => void;
}

/**
 * useFetcher中间件的context参数
 */
export interface AlovaFetcherMiddlewareContext<AG extends AlovaGenerics> extends AlovaMiddlewareContext<AG> {
  /** 数据预加载函数 */
  fetch<Transformed>(method: Method<AG>, ...args: any[]): Promise<Transformed>;

  /** fetchArgs 响应处理回调的参数，该参数由useFetcher的fetch传入 */
  fetchArgs: any[];

  /** fetch状态集合 */
  fetchStates: FetchRequestState<
    ExportedType<boolean, AG['State']>,
    ExportedType<Error | undefined, AG['State']>,
    ExportedType<Progress, AG['State']>,
    ExportedType<Progress, AG['State']>
  >;

  /** 状态更新函数 */
  update: FetcherExportedUpdate;

  /**
   * 调用后将自定义控制fetching的状态，内部不再触发fetching状态的变更
   * 传入control为false时将取消控制
   *
   * @param control 是否控制fetching，默认为true
   */
  controlFetching: (control?: boolean) => void;
}

/** 中间件next函数 */
export interface MiddlewareNextGuardConfig<AG extends AlovaGenerics> {
  force?: UseHookConfig<AG>['force'];
  method?: Method<AG>;
}
export interface AlovaGuardNext<AG extends AlovaGenerics> {
  (guardNextConfig?: MiddlewareNextGuardConfig<AG>): Promise<AG['Responded']>;
}

/**
 * alova useRequest/useWatcher中间件
 */
export interface AlovaFrontMiddleware<AG extends AlovaGenerics> {
  (context: AlovaFrontMiddlewareContext<AG>, next: AlovaGuardNext<AG>): any;
}
/**
 * alova useRequest/useWatcher中间件
 */
export interface AlovaFetcherMiddleware<AG extends AlovaGenerics> {
  (context: AlovaFetcherMiddlewareContext<AG>, next: AlovaGuardNext<AG>): any;
}

/** common hook configuration */
export interface UseHookConfig<AG extends AlovaGenerics> {
  /**
   * force request or not
   * @default false
   */
  force?: boolean | ((event: AlovaEvent<AG>) => boolean);

  /**
   * refering object that sharing some value with this object.
   */
  __referingObj?: ReferingObject;

  /**
   * other attributes
   */
  [attr: string]: any;
}

/** useRequest和useWatcher都有的类型 */
type InitialDataType = number | string | boolean | object;
export interface FrontRequestHookConfig<AG extends AlovaGenerics> extends UseHookConfig<AG> {
  /** 是否立即发起一次请求 */
  immediate?: boolean;

  /** set initial data for request state */
  initialData?: InitialDataType | (() => InitialDataType);

  /** 额外的监管状态，可通过updateState更新 */
  managedStates?: Record<string | symbol, AG['State']>;

  /** 中间件 */
  middleware?: AlovaFrontMiddleware<AG>;
}

/** useRequest config export type */
export type RequestHookConfig<AG extends AlovaGenerics> = FrontRequestHookConfig<AG>;

/** useWatcher config export type */
export interface WatcherHookConfig<AG extends AlovaGenerics> extends FrontRequestHookConfig<AG> {
  /** 请求防抖时间（毫秒），传入数组时可按watchingStates的顺序单独设置防抖时间 */
  debounce?: number | number[];
  abortLast?: boolean;
}

/** useFetcher config export type */
export interface FetcherHookConfig<AG extends AlovaGenerics = AlovaGenerics> extends UseHookConfig<AG> {
  /** 中间件 */
  middleware?: AlovaFetcherMiddleware<AG>;
  /** fetch是否同步更新data状态 */
  updateState?: boolean;
}

/** 调用useFetcher时需要传入的类型，否则会导致状态类型错误 */
export type FetcherType<A extends Alova<any>> = {
  state: ReturnType<NonNullable<A['options']['statesHook']>['create']>;
  export: ReturnType<NonNullable<NonNullable<A['options']['statesHook']>['export']>>;
};

/**
 * 以支持React和Vue的方式定义类型，后续需要其他类型再在这个基础上变化
 * 使用不同库的特征作为父类进行判断
 */
export interface SvelteWritable {
  set(this: void, value: any): void;
}
export interface VueRef {
  value: any;
}
export type ExportedType<R, S> = S extends VueRef ? Ref<R> : S extends SvelteWritable ? Writable<R> : R;
export type SendHandler<R> = (...args: any[]) => Promise<R>;
export type UseHookReturnType<AG extends AlovaGenerics = AlovaGenerics> = FrontRequestState<
  ExportedType<boolean, AG['State']>,
  ExportedType<AG['Responded'], AG['State']>,
  ExportedType<Error | undefined, AG['State']>,
  ExportedType<Progress, AG['State']>,
  ExportedType<Progress, AG['State']>
> & {
  abort: () => void;
  update: FrontExportedUpdate<AG['Responded']>;
  send: SendHandler<AG['Responded']>;
  onSuccess: (handler: SuccessHandler<AG>) => void;
  onError: (handler: ErrorHandler<AG>) => void;
  onComplete: (handler: CompleteHandler<AG>) => void;
  __referingObj: ReferingObject;
};
export type UseFetchHookReturnType<State> = FetchRequestState<
  ExportedType<boolean, State>,
  ExportedType<Error | undefined, State>,
  ExportedType<Progress, State>,
  ExportedType<Progress, State>
> & {
  fetch<R>(matcher: Method, ...args: any[]): Promise<R>;
  update: FetcherExportedUpdate;
  abort: UseHookReturnType['abort'];
  onSuccess: UseHookReturnType['onSuccess'];
  onError: UseHookReturnType['onError'];
  onComplete: UseHookReturnType['onComplete'];
};

export interface MethodFilterHandler {
  (method: Method, index: number, methods: Method[]): boolean;
}

export type MethodDetaiedFilter = {
  name?: string | RegExp;
  filter?: MethodFilterHandler;
};
export type MethodFilter = string | RegExp | MethodDetaiedFilter;

export type UpdateStateCollection<Responded> = {
  [key: string | number | symbol]: (data: any) => any;
} & {
  data?: (data: Responded) => any;
};

export type AlovaMethodHandler<AG extends AlovaGenerics> = (...args: any[]) => Method<AG>;

/**
 * alova global configurations.
 */
export interface AlovaGlobalConfig {
  /**
   * switch of auto hit cache.
   * here is three options:
   * - global: invalidate cache cross alova instances.
   * - self: only invalidate cache from the same alova instance.
   * - close: don't auto invalidate cache any more.
   * @default 'global'
   */
  autoHitCache?: 'global' | 'self' | 'close';
}

// ************ exports ***************
/**
 * create an alova instance.
 * @param options global options
 * @returns alova instance
 */
export declare function createAlova<State, Computed, Watched, Export, RequestConfig, Response, ResponseHeader>(
  options: AlovaOptions<AlovaGenerics<State, Computed, Watched, Export, any, any, RequestConfig, Response, ResponseHeader>>
): Alova<AlovaGenerics<State, Computed, Watched, Export, any, any, RequestConfig, Response, ResponseHeader>>;

/**
 * 自动管理响应状态hook
 * @example
 * ```js
 * const { loading, data, error, send, onSuccess } = useRequest(alova.Get('/api/user'))
 * ```
 * @param methodHandler method实例或获取函数
 * @param config 配置项
 * @returns 响应式请求数据、操作函数及事件绑定函数
 */
export declare function useRequest<AG extends AlovaGenerics>(
  methodHandler: Method<AG> | AlovaMethodHandler<AG>,
  config?: RequestHookConfig<AG>
): UseHookReturnType<AG>;

/**
 * 监听特定状态值变化后请求
 * @example
 * ```js
 *  const { data, loading, error, send, onSuccess } = useWatcher(() => alova.Get('/api/user-list'), [keywords])
 * ```
 * @param methodHandler method实例或获取函数
 * @param watchingStates 监听状态数组
 * @param config 配置项
 * @returns 响应式请求数据、操作函数及事件绑定函数
 */
export declare function useWatcher<AG extends AlovaGenerics>(
  methodHandler: Method<AG> | AlovaMethodHandler<AG>,
  watchingStates: AG['Watched'],
  config?: WatcherHookConfig<AG>
): UseHookReturnType<AG>;

/**
 * 数据预拉取
 * @example
 * ```js
 * const { fetching, error, fetch } = useFetcher();
 * const handleFetch = () => {
 *   fetch(alova.Get('/api/profile'));
 * };
 * ```
 * @param config 配置项
 * @returns 响应式请求数据、操作函数及事件绑定函数
 */
export declare function useFetcher<SE extends FetcherType<any>>(config?: FetcherHookConfig): UseFetchHookReturnType<SE['state']>;

/**
 * invalidate cache
 * @example
 * ```js
 * // invalidate cache with specific method instance.
 * invalidateCache(alova.Get('/api/profile'));
 *
 * // match method snapshots then invalidate them.
 * const methods = alova.matchSnaptshot('method-name');
 * invalidateCache(methods);
 *
 * // invalidate all cache.
 * invalidateCache();
 * ```
 * @param matcher method实例数组或method匹配器参数
 */
export declare function invalidateCache(matcher?: Method | Method[]): Promise<void>;

export interface UpdateOptions {
  onMatch?: (method: Method) => void;
}
/**
 * cross components to update states by specifing method instance.
 * @example
 * ```js
 * updateState(methodInstance, newData);
 * updateState(methodInstance, oldData => {
 *   oldData.name = 'new name';
 *   return oldData;
 * });
 * ```
 * @param matcher method instance
 * @param handleUpdate new data or update function that returns new data
 * @returns is updated
 */
export declare function updateState<Responded>(
  matcher: Method<AlovaGenerics<any, any, any, any, Responded>>,
  handleUpdate: UpdateStateCollection<Responded>['data'] | UpdateStateCollection<Responded>
): Promise<boolean>;

export interface CacheSetOptions {
  /**
   * cache policy.
   * - l1: only set l1 cache.
   * - l2: only set l2 cache.
   * - all: set l1 cache and set l2 cache(method cache mode need to be 'restore').
   * @default 'all'
   */
  policy?: 'l1' | 'l2' | 'all';
}
/**
 * set cache manually
 * @example
 * ```js
 * // set static cache
 * setCache(methodInstance, newData);
 *
 * // set cache dynamically
 * setCache(methodInstance, oldData => {
 *   if (oldData.name === 'new name') {
 *     // it indicates that the cache is not updated when returning undefined
 *     return;
 *   }
 *   old.name = 'new name';
 *   return oldData;
 * });
 *
 * // get methods from snapshots
 * const methods = alova.getSnapshots('method-name');
 * setCache(methods, newData);
 * ```
 * @param matcher method instance(s)
 */
export declare function setCache<Responded>(
  matcher: Method<AlovaGenerics<any, any, any, any, Responded>> | Method<AlovaGenerics<any, any, any, any, Responded>>[],
  dataOrUpdater: Responded | ((oldCache: Responded) => Responded | undefined | void),
  options?: CacheSetOptions
): Promise<void>;

export interface CacheQueryOptions {
  /**
   * cache policy.
   * - l1: only query l1 cache.
   * - l2: only query l2 cache.
   * - all: query l1 cache first and query l2 cache if l1 cache not found(method cache mode need to be 'restore').
   * @default 'all'
   */
  policy?: 'l1' | 'l2' | 'all';
}
/**
 * query cache data
 * @example
 * ```js
 *  const cache = queryCache(alova.Get('/api/profile'));
 * ```
 * @param matcher method instance
 * @returns cache data, return undefined if not found
 */
export declare function queryCache<Responded>(
  matcher: Method<AlovaGenerics<any, any, any, any, Responded>>,
  options?: CacheQueryOptions
): Promise<Responded | undefined>;

/**
 * hit(invalidate) target caches by source method
 * this is the implementation of auto invalidate cache
 * @param sourceMethod source method instance
 * @example
 * ```js
 * await hitCacheBySource(alova.Get('/api/profile'));
 * ```
 */
export declare function hitCacheBySource(sourceMethod: Method): Promise<void>;

/**
 * 获取请求方式的key值
 * @param {Method} method method实例
 * @returns — 此请求方式的key值
 */
export declare function getMethodKey(method: Method): string;

/**
 * Set global configuration
 * @param config configuration
 */
export declare function globalConfig(config: AlovaGlobalConfig): void;

/**
 * get the unified statesHook, and it will throw error if not set.
 * @returns the unified statesHook
 */
export declare function promiseStatesHook<State, Computed>(): StatesHook<State, Computed>;
