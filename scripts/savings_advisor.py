#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
麦门省钱助手 —— 比价演示脚本
================================
演示本 Skill 的核心逻辑：对同一份商品清单，比较「原价方案」与各「带券方案」
的 calculate-price 结果，输出最低价方案与省钱金额。

用法：
    python savings_advisor.py plan.json

plan.json 示例（calculate-price 返回结果的 JSON 文件，可含多个方案）：
{
  "store": "望京麦当劳",
  "plans": [
    {"name": "原价-到店自取", "totalPrice": 4650, "coupon": null},
    {"name": "巨无霸买一送一", "totalPrice": 3450, "coupon": "BOGO-BIGMAC-10"},
    {"name": "会员日8折券",   "totalPrice": 3720, "coupon": "VIP-80PCT"}
  ]
}

价格单位均为「分」，展示时除以 100 转为「元」。
真实环境中，plans 数据由麦当劳 MCP Server 的 calculate-price 工具实时返回，
MCP Token 通过环境变量 MCP_TOKEN 注入，本脚本不存储任何凭证。
"""
import json
import sys


def load_plans(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    plans = data.get("plans")
    if not plans:
        raise ValueError("plan.json 中缺少 'plans' 数组")
    for p in plans:
        if "name" not in p or "totalPrice" not in p:
            raise ValueError(f"方案缺少 name/totalPrice 字段: {p}")
        if p["totalPrice"] <= 0:
            raise ValueError(f"价格必须为正数: {p['name']}")
    return data


def recommend(data: dict) -> dict:
    plans = data["plans"]
    best = min(plans, key=lambda p: p["totalPrice"])
    baseline = next((p for p in plans if not p.get("coupon")), plans[0])
    savings = baseline["totalPrice"] - best["totalPrice"]
    return {"store": data.get("store", "未指定门店"), "best": best,
            "baseline": baseline, "savings": savings}


def fmt(fen: int) -> str:
    return f"¥{fen / 100:.2f}"


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    try:
        data = load_plans(sys.argv[1])
    except (OSError, ValueError, json.JSONDecodeError) as e:
        print(f"[错误] {e}")
        return 2

    print(f"🏪 门店：{data.get('store', '未指定门店')}")
    print("-" * 46)
    for p in sorted(data["plans"], key=lambda x: x["totalPrice"]):
        tag = f"（券：{p['coupon']}）" if p.get("coupon") else "（无券）"
        print(f"  {p['name']}{tag:<28} {fmt(p['totalPrice'])}")
    print("-" * 46)

    r = recommend(data)
    print(f"✅ 推荐方案：{r['best']['name']}")
    if r["savings"] > 0:
        print(f"💰 相比原价省：{fmt(r['savings'])}")
    else:
        print("ℹ️ 各方案价格相同，直接原价购买即可，无需用券。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
