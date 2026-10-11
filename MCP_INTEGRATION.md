# MCP_INTEGRATION — 麦当劳 MCP 集成说明

本项目基于 McDonald's MCP Server（`https://mcp.mcd.cn`）开发，通过 WorkBuddy 的自定义连接器（streamablehttp + Bearer Token）接入。以下说明本 Skill 实际使用的 Server、Tool、调用流程与业务价值。

## 使用的 MCP Server

| Server | 接入方式 | 鉴权 |
|---|---|---|
| `mcd-mcp`（McDonald's China MCP Server） | WorkBuddy 自定义连接器，`streamablehttp`，URL `https://mcp.mcd.cn` | `Authorization: Bearer <MCP_TOKEN>`（环境变量注入，不入库） |

## 实际使用的 Tool 及调用流程

### 1. 优惠券盘点（`query-my-coupons`）

- **When**：用户问"我有哪些券 / 哪张券快过期"
- **Input**：无必填参数
- **Output**：券列表（券 ID、券码、适用商品、面额/折扣、有效期）
- **业务价值**：摸清"弹药库"，是后续所有省钱计算的输入

### 2. 门店可用券查询（`query-store-coupons`）

- **When**：用户确定了门店，想看该门店叠加优惠
- **Input**：门店编码
- **Output**：该门店可用的券/促销
- **业务价值**：优惠券的可用性随门店而变，避免"到店才发现用不了"

### 3. 菜单与商品详情（`query-meals` / `query-meal-detail`）

- **When**：用户描述想吃的食物
- **Input**：门店编码 / 商品编码
- **Output**：商品编码 `productCode`、规格、`modification` 特制选项信息
- **业务价值**：把自然语言"想吃巨无霸套餐"翻译成下单参数

### 4. 价格计算与比价（`calculate-price`）⭐ 核心

- **When**：比较"原价购买"与"用券购买"两种方案
- **Input**：`storeCode`、`orderType`(1=到店 / 2=外送)、`beType`、`items[]`（含/不含 `couponId`+`couponCode` 各算一次）
- **Output**：总价（单位为分，展示时 ÷100 转元）、`takeWayList`（到店取餐方式）
- **业务价值**：**同一次调用接口、两次试算（带券 / 不带券），差价即省钱金额**，这是本 Skill 的核心逻辑

### 5. 活动日历与促销（`campaign-calendar` / `query-promotions`）

- **When**：用户问"今天有什么活动 / 要不要等等再买"
- **Output**：近期活动（会员日、免费汉堡日、限时优惠）
- **业务价值**：把"现在买"升级为"最划算的时候买"

### 6. 积分商城（`mall-points-products` / `mall-product-detail`）

- **When**：用户问"积分能换什么 / 换还是买划算"
- **Output**：可兑换商品、所需积分、`skuId`
- **业务价值**：对比"现金价"与"积分折算价值"，给出兑换建议

## 端到端调用流程示例

以"30 元以内最划算的午餐"为例：

```
1. query-nearby-stores        → 选定门店（storeCode）
2. query-meals                → 拉取菜单，圈定候选商品
3. query-my-coupons           → 读取可用券
4. calculate-price (无券方案)  → 总价 A
5. calculate-price (带券方案)  → 总价 B（对每张可匹配的券分别试算）
6. 输出对比：min(A,B…)、省钱金额、推荐券，并给出下单建议
7. 用户确认后 → create-order 完成下单（可选）
```

## 安全说明

- MCP Token 仅通过 WorkBuddy 连接器配置注入，项目代码与文档中不含任何真实凭证
- 所有涉及下单、绑券的敏感操作均需用户在对话中明确确认后才执行
