# 阶段2：代码生成提示词模板

## 你的任务

请作为资深开发工程师，根据阶段1的需求分析结果生成完整的可执行代码。

**需求分析结果**：{从phase1_requirements.json读取}

## 代码生成要求

### 1. 完整性
- 生成所有必要的文件（不要遗漏配置文件、测试文件）
- 包含依赖管理文件（package.json、requirements.txt等）
- 提供README.md说明如何运行

### 2. 代码质量
- 遵循语言的最佳实践和编码规范
- 使用有意义的变量名和函数名
- 保持函数单一职责（一个函数只做一件事）
- 避免过度嵌套（最多3层）

### 3. 注释规范
- 每个文件开头说明文件用途
- 每个公共函数/类添加文档注释
- 复杂逻辑添加行内注释
- 注释语言与代码库保持一致（中文或英文）

### 4. 错误处理
- 所有外部调用添加错误处理
- 提供清晰的错误消息
- 避免使用裸except/catch（要指定具体异常类型）

### 5. 安全性
- 敏感信息用环境变量（不要硬编码API密钥）
- 验证所有用户输入
- 使用参数化查询防止SQL注入
- 密码必须加密存储

### 6. 可测试性
- 为关键功能生成单元测试
- 测试覆盖核心业务逻辑
- 提供测试运行命令

## 输出格式

请使用Markdown格式输出，每个文件用代码块标注：

````markdown
# 项目代码生成结果

## 项目结构

\`\`\`
project/
├── src/
│   ├── main.py
│   ├── config.py
│   └── utils.py
├── tests/
│   └── test_main.py
├── requirements.txt
└── README.md
\`\`\`

## 文件内容

### `src/main.py`

\`\`\`python
"""
主程序入口
功能：[描述]
"""

def main():
    """主函数"""
    pass

if __name__ == "__main__":
    main()
\`\`\`

### `src/config.py`

\`\`\`python
"""
配置文件
管理项目的所有配置项
"""

import os

# 从环境变量读取敏感信息
api_key_value = os.getenv("API_KEY", "")
\`\`\`

### `requirements.txt`

\`\`\`
# 项目依赖
requests==2.31.0
python-dotenv==1.0.0
\`\`\`

### `README.md`

\`\`\`markdown
# 项目名称

## 安装

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## 运行

\`\`\`bash
python src/main.py
\`\`\`

## 测试

\`\`\`bash
pytest tests/
\`\`\`
\`\`\`

## 实现说明

[解释关键实现逻辑、设计决策、注意事项]

## 依赖说明

- **requests**: HTTP请求库
- **python-dotenv**: 环境变量管理

## 下一步

1. 配置环境变量（创建.env文件）
2. 安装依赖（pip install -r requirements.txt）
3. 运行测试（pytest tests/）
4. 启动项目（python src/main.py）
````

## 输出位置

默认直接返回上述 Markdown。只有在用户批准项目写入后，才可保存到 `.kim-orchestrator/phase2_code.md`；目标存在时先读取并受管更新。

## 代码示例参考

### Python项目结构
```python
# 良好的Python函数示例
def calculate_total(items: list[dict]) -> float:
    """
    计算订单总金额

    Args:
        items: 订单项列表，格式 [{"price": 10.0, "quantity": 2}, ...]

    Returns:
        float: 总金额

    Raises:
        ValueError: 如果items为空或格式不正确
    """
    if not items:
        raise ValueError("订单项不能为空")

    total = sum(item["price"] * item["quantity"] for item in items)
    return round(total, 2)
```

### JavaScript/TypeScript项目结构
```typescript
// 良好的TypeScript函数示例
/**
 * 计算订单总金额
 * @param items - 订单项列表
 * @returns 总金额
 * @throws {Error} 如果items为空
 */
function calculateTotal(items: OrderItem[]): number {
  if (items.length === 0) {
    throw new Error("订单项不能为空");
  }

  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

## 注意事项

1. **KISS原则**：能用简单方法解决的，不要搞复杂
2. **DRY原则**：重复的代码提取成函数/类
3. **YAGNI原则**：不要写用不到的代码
4. **向后兼容**：不要破坏现有API接口
5. **性能考虑**：关键路径的代码要考虑性能
6. **代码可运行**：生成的代码必须能直接运行（不要占位符）

---

**这个阶段的输出将作为Gemini代码审查的输入，请确保代码质量高、注释清晰！**
