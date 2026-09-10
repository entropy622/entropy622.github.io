---
title: react学习笔记
description: 
date: 2025-03-28
slug: react学习笔记
image: img.png
categories:
    - 笔记
---

## react 基础
### state同步的注意事项
```react
  import { useState } from 'react';
  
  export default function Clock(props) {
    const [color, setColor] = useState(props.color);
    return (
      <h1 style={{ color: color }}>
        {props.time}
      </h1>
    );
  }
```
React 状态初始化机制：

useState(props.color) 仅在组件 **首次渲染时**  使用 props.color 的初始值
后续父组件传入的 props.color 变化时，这个初始化代码不会再执行, 造成了color和props的不同步.

可以简单的改为:
```react
import { useState } from 'react';

export default function Clock(props) {
  return (
    <h1 style={{ color: props.color }}>
      {props.time}
    </h1>
  );
}

```

### 不应该把组件函数的定义嵌套起来
```react
import { useState } from 'react';

export default function MyComponent() {
  const [counter, setCounter] = useState(0);

  function MyTextField() {
    const [text, setText] = useState('');

    return (
      <input
        value={text}
        onChange={e => setText(e.target.value)}
      />
    );
  }

  return (
    <>
      <MyTextField />
      <button onClick={() => {
        setCounter(counter + 1)
      }}>点击了 {counter} 次</button>
    </>
  );
}

```

每次点击按钮，输入框的 state 都会消失！这是因为每次 MyComponent 渲染时都会创建一个 不同 的 MyTextField 函数。
在相同位置渲染的是**不同**的组件，所以 React 将其下所有的 state 都重置了。

### 不要在useEffect中改变state
```react
const [count, setCount] = useState(0);
useEffect(() => {
  setCount(count + 1);
});
```
默认情况下, useEffect会在组件选然后执行, 所以会无限循环。


### 没看懂
https://zh-hans.react.dev/learn/manipulating-the-dom-with-refs 深入探讨 _如何使用 ref 回调管理 ref 列表_ 

## react query


我们看一个react query的最小实现:

### 最小实现
```react
import { QueryClient, useQuery } from '@tanstack/react-query'
import './index.css'

function App() {
  const { data, isPending, status } = useQuery({
    queryKey: ['dishes'],
    queryFn: async () => {
      return fetch(
        'http://localhost:8080/admin/dish/page?categoryId=&name=&page=1&pageSize=10&status=1'
      ).then(res => {
        if (!res.ok) {
          throw new Error(`请求错误:${res.status}`)
        }
        return res.json()
      })
    }
  })
  if (isPending) return <div>加载中...</div>
  if (status === 'error') return <div>请求错误</div>
  return <div>{JSON.stringify(data)}</div>
}

export default App

```
在这个最小实现中, react query实际包装和抽象了一个通用服务器请求的流程, 这个通用的流程是"创建useState,
发起请求并判断请求的状态(isPending, isError等). 如果请求成功, 将请求存入缓存(useState), 并附上一个
时间戳, 之后在这个queryKey对应的请求数据被用到时(组件重新挂载,窗口聚焦等时期)判断缓存是否过期,
如果过期则重新请求并更新缓存; 如果请求失败, 则隔一段时间继续请求;"

如果我们不用react query, 那么这个组件的实现应该是这样的:
```react
import { useState, useEffect, useRef } from 'react'
import './index.css'

// 缓存配置
const CACHE_EXPIRY_TIME = 5 * 60 * 1000 // 5分钟缓存有效期

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  //数据缓存
  const [cache, setCache] = useState({
    data: null,
    timestamp: 0
  })

  // 重试次数计数器
  const maxRetries = 3
  const retryRemainRef = useRef(maxRetries)

  // @ts-ignore
  async function queryFn() {
    const response = await fetch(
      'http://localhost:8080/admin/dish/page?categoryId=&name=&page=1&pageSize=10&status=1'
    )

    if (!response.ok) {
      throw new Error(`请求失败，状态码：${response.status}`)
    }
    const jsonData = await response.json()

    // 更新缓存. 但实际上reactQuery会在四种情况下更新缓存:
    //1. queryKey发生改变.
    //2. 拥有这个queryKey的组件挂载时
    //3. 窗口重新聚焦
    //4. 网络重新连接
    //这里只模拟了第二种情况.
    //同时, 在reactQuery里面, 可以通过设置refetchOnMount, refetchOnWindowFocus,
    //refetchOnReconnect来让后三种情况不触发缓存更新.
    setCache({
      data: jsonData.data?.records,
      timestamp: Date.now()
    })

    retryRemainRef.current = 0 // 将remain的retry值设置为0, 表示已成功, 不需要接着重试了.
  }

  // @ts-ignore
  async function query(): Promise<void> {
    setIsLoading(true)
    setError(null)

    try {
      await queryFn()
    } catch (err) {
      setError(err.message)

      // 重试, 重试时间间指数递增
      if (retryRemainRef.current >= 0) {
        const delay = Math.min(
          1000 * 2 ** (maxRetries - retryRemainRef.current),
          30000
        )
        setTimeout(() => {
          retryRemainRef.current--
          queryFn()
        }, delay)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const now = Date.now()

    // 在缓存不存在的情况时进行查询
    // 检查缓存有效性, 模拟staleTime的机制.
    if (!cache.data || now - cache.timestamp > CACHE_EXPIRY_TIME) {
      query()
    }
  }, []) // 空依赖表示只在组件挂载时执行

  if (isLoading) return <div>加载中...</div>
  if (error) return <div>错误：{error}</div>

  return <div>{JSON.stringify(cache.data?.slice(0, 10))}</div>
}

export default App


```

显然, react query的实现更简洁, 更易读, 更易维护, 更易扩展(我想谁也不愿意在js里面面对一大堆useState和useEffect).
而且上面不用reactQuery的这一段代码都是复用性很高的, 因此就算不用react query, 我们也应该把这一段逻辑抽象封装起来.

同时, 由于react query的key机制, react query用起来就像一个键值对数据库.
围绕于此, react也提供了很多实用的机制:
比如减少重复的请求(在缓存中有对应key的数据时, 不会发起请求), 
垃圾回收(在一条查询缓存过久(超过gcTime)没有被组件使用后, 会被自动删除),


### 实际使用例子


