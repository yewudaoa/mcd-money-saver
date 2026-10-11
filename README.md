# 🍔 麦门省钱助手 (M Money-Saver Skill)

> 麦当劳程序员创意开发大赛参赛作品
> 基于 McDonald's MCP Server 开发的 WorkBuddy Skill：让每一顿麦当劳都花得明明白白、省得实实在在。

## 项目简介

「麦门省钱助手」是一个运行在 WorkBuddy 中的 Skill。它的核心创意是：

1. **券-餐智能匹配**：读取你名下可用的优惠券，与你想吃的商品自动匹配，告诉你"单点省钱"还是"凑券更香"。
2. **最低价组合推荐**：对同一份"想吃的清单"，分别按原价、最优券组合计算到店取餐 / 麦乐送两种方式的总价，给出最省方案。
3. **优惠日历提醒**：结合活动日历（campaign-calendar），告诉你今天是不是"会员日/免费汉堡日"，该不该等一等再下单。
4. **积分价值最大化**：查询积分商城可兑换商品，帮你判断"花钱买"还是"积分换"更划算。

一句话：**点麦当劳之前先问它一句，能省则省。**

## 目标用户

- 每周至少吃一次麦当劳的"麦门"信徒
- 想吃巨无霸但绝不肯花冤枉钱的精打细算型程序员
- 想搞清楚"这堆券到底哪张最划算"的选择困难症患者

## 安装方法

### 前置条件

- [WorkBuddy](https://www.workbuddy.cn/)（本次大赛官方合作伙伴）
- 麦当劳中国 MCP Token（申请方式见[大赛官方仓库](https://github.com/M-China/mcd-developer-innovation-challenge)）

### 安装步骤

1. 打开 WorkBuddy → 左侧边栏【专家·技能·连接器】→【连接器】
2. 点击右上角【自定义连接器】→【配置MCP】，填入：

```json
{
  "mcpServers": {
    "mcd-mcp": {
      "type": "streamablehttp",
      "url": "https://mcp.mcd.cn",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_TOKEN"
      }
    }
  }
}
```

> ⚠️ 将 `YOUR_MCP_TOKEN` 替换为你的实际 MCP Token（切勿把真实 Token 提交到仓库，请使用环境变量或本地配置）。

3. 回到【自定义连接器】，将 `mcd-mcp` 设为【启用】
4. 将本仓库 `skill/SKILL.md` 放入你的 WorkBuddy 项目技能目录：`.workbuddy/skills/mcd-money-saver/SKILL.md`
5. 在对话框输入需求即可使用，例如：

```
帮我看看今天用哪张券吃麦当劳最划算？我想吃一个巨无霸套餐加一杯可乐。
```

## 使用示例

| 你说 | Skill 做的事 |
|---|---|
| "我有哪几张券？哪些快过期？" | 调用 `query-my-coupons` 列出券并按到期时间排序 |
| "巨无霸单点 vs 用券哪个便宜？" | 查询商品 + 券，调用 `calculate-price` 对比两种价格 |
| "今天有什么活动？要不要等？" | 调用 `campaign-calendar` / `query-promotions` 给出建议 |
| "帮我配一单 30 块以内最划算的午餐" | 组合推荐：多方案试算并输出最低价方案 |
| "我的积分能换什么？" | 调用 `mall-points-products` 查询可兑换商品 |

## 技术实现

- **Skill 定义**：`skill/SKILL.md` —— 纯声明式编排，定义了券匹配、比价、组合推荐等标准工作流，由 WorkBuddy AI 代理执行
- **示例脚本**：`scripts/savings_advisor.py` —— 一个独立的比价演示脚本，展示"原价 vs 券后价"的核心计算逻辑（输入 MCP `calculate-price` 的返回 JSON，输出省钱结论），方便没有 WorkBuddy 的同学理解思路
- **不存储任何凭证**：所有配置通过环境变量注入，符合参赛信息安全声明

## MCP_INTEGRATION

见 [MCP_INTEGRATION.md](MCP_INTEGRATION.md)：详细说明使用的 MCP Server、Tool、调用流程与业务价值。

## 参赛声明

见 [CONTEST_DECLARATION.md](CONTEST_DECLARATION.md)（官方原文，未修改）。

---

*本项目为麦当劳程序员节创意开发大赛参赛作品，由参赛者独立开发，非麦当劳官方产品。餐品信息、价格及供应状态以麦当劳官方渠道的实时结果为准。*
