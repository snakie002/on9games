---
title: "如何建造通用火車, 幾個新火車系統 / 功能應用"
date: "2024-10-21"
categories:
  - "factorio"
  - "guide"
  - ""
tags:
  - "hfok"
  - "Factorio"
  - "異星工廠"
coverImage: "post_assets/Title Factorio418(11).jpg"

---

<!-- Embed -->

<iframe width="100%" height="440" src="https://www.youtube.com/embed/mgbtu4TsOMw" 
  title="YouTube video player" frameborder="0" allow="accelerometer; autoplay;
  clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


<!-- Context -->
## 建造高架鐵軌 (G)

![](post_assets/b43470a0e7706c112723afd2494505b3.JPG)

高架鐵軌分為兩個新的建築:
1. 斜波 - 重地面升上高架/重高架返回地上
2. 支架 - 高架鐵軌的支撐, 可以在水面/熔岩上興建!
要切換成建造高架鐵軌只需要按G鍵便可

## 調度計劃

![](post_assets/12f2bc9b4826a38c476671398dd3e6c3.PNG)

調度計劃的作用是當完成一個排程時
火車會先審視有沒有合適的調度計畫
如果有的話, 系統會先處理合適的調度繼畫
上圖的例子是製作停泊站用的
當火車沒有貨物, 也沒有別的火車站有空位
便會自動駛往停泊站, 不會堵塞交通

## 可中斷其他調度計劃

![](post_assets/b8a6f54f1162326133a6811f24cbfcb8.PNG)

這個設定可以理解為當有這個調度計畫和其他調度計畫同時被觸法時
有可中斷的會消除掉其他調度計畫, 優先處理這個
上圖例子就是當火車燃料不足 (所有燃料總數小於20)
便會先到加油站補充燃料

## 任意物品參數

![](post_assets/154f5b42a82d265d5f235ac43e6b3262.PNG)

上圖綠色圖示是其中一種任意參數 - 任意物品參數
有任意燃料稅, 物品, 液體等等.
它定功能可以自動變成任何在在車箱裡的物品
有了這個參數, 就可以讓火車根據車箱裡的物品
將要到達的目的地變成那個東西
如果你的火車站也用那些物品的圖示
那就可以實現一輛火車每次都可以載不同的物品到不同的終點
上圖為例, 我的火車站都是統一使用 <物品參數>Dropoff
所以火車便可以自動駛往正確的火車站

## 通用火車設定

![](post_assets/a7263df81316f35b9d57578e208a55ed.JPG)

以上就是我所有通用火車的排程
要讓火車可以隨便到任意一個上貨車站
他們必須要用同一個名字
這裡我使用了 Ore Pickup

![](post_assets/5b1239685ae0d3411512738485f26bba.JPG)

上圖可見叫 Ore Pickup 的分別有銅礦,鐵礦和煤
在以前的版本這樣設定會把貨品都混在一起
多得以上解釋了的調度計畫和統一火車站的名字
就不會發生這種事情混在一起
從而實現了通用火車
最後, 不要忙記火車站要設定火車數上限
否則所有火車都只會往最近的上貨車站上貨!