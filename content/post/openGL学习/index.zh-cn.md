---
title: openGL学习
description: openGL学习
date: 2025-12-15
slug: 
image: img.png
categories:
    - openGL
---

这几天爽学LearnOpenGL，记录一下成果

从三角形开始的旅途

![img_1.png](img_1.png)

材质

![img_2.png](img_2.png)

整理了一下小渲染器的工程，添加了mesh class

![img_3.png](img_3.png)

阴影

![img_4.png](img_4.png)

高光，自发光。高光贴图。

![img_5.png](img_5.png)

加入assimp，支持模型导入；写了一个最简单的toon shader和描边。

![img_6.png](img_6.png)

后处理（图中是边缘检测）

![img_7.png](img_7.png)

立方体贴图，天空盒；镜面材质。

![img_8.png](img_8.png)

阴影映射

![img_9.png](img_9.png)
![img.png](img.png)

bloom。也做了hdr和伽马矫正，但是发现做了后泛白，就关了。

![img_10.png](img_10.png)


## 总结
Learn OpenGL是一个相当有意思以及实用的教程。动手真正写了一个小渲染器后才知道draw call到底是什么，显存分配到底是怎么一回事，

此外，这算是我第一个c++为主的大工程。cmake的配置很头疼，尤其是配置assimp的那一块，也算踩了必须会踩的坑。

总之，还是很有成就感的！









