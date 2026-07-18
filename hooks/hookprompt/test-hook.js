#!/usr/bin/env node
/**
 * Hook功能测试工具
 *
 * 用于本地测试user-prompt-submit hook是否正常工作
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 测试用例
const testCases = [
    {
        name: '简短回复（应跳过优化）',
        input: '好的',
        expectOptimization: false
    },
    {
        name: '太短输入（应跳过优化）',
        input: '继续',
        expectOptimization: false
    },
    {
        name: '短诊断输入（应触发优化）',
        input: '这个不行',
        expectOptimization: true,
        expectContains: '这个不行'
    },
    {
        name: '短错误反馈（应触发优化）',
        input: '报错了',
        expectOptimization: true,
        expectContains: '报错了'
    },
    {
        name: '短检查请求（应触发优化）',
        input: '帮我看看',
        expectOptimization: true,
        expectContains: '帮我看看'
    },
    {
        name: '英文短错误反馈（应触发优化）',
        input: 'error',
        expectOptimization: true,
        expectContains: 'error'
    },
    {
        name: '正常长文本（应触发优化）',
        input: '帮我写一个用户登录功能',
        expectOptimization: true
    },
    {
        name: '复杂需求（应触发优化）',
        input: '我需要实现一个完整的购物车系统，包括添加商品、修改数量、删除商品和结算功能',
        expectOptimization: true
    },
    {
        name: 'Codex JSON输入（应只提取prompt字段）',
        input: JSON.stringify({
            hook_event_name: 'UserPromptSubmit',
            prompt: '帮我做个小红书营销自动发布器'
        }),
        expectOptimization: true,
        expectContains: '帮我做个小红书营销自动发布器',
        expectNotContains: '"hook_event_name"'
    },
    {
        name: 'Codex内部目标续跑（应跳过优化）',
        input: JSON.stringify({
            hook_event_name: 'UserPromptSubmit',
            prompt: '<codex_internal_context source="goal">\nContinue working toward the active thread goal.\n\n<objective>\n继续处理课程正文\n</objective>\n</codex_internal_context>'
        }),
        expectOptimization: false
    },
    {
        name: '普通斜杠命令（应跳过优化）',
        input: '/help',
        expectOptimization: false
    },
    {
        name: 'Meta_Kim治理斜杠入口（应触发优化）',
        input: '/meta-theory 帮我检查一下本项目看看有什么问题没有',
        expectOptimization: true,
        expectContains: '/meta-theory 帮我检查一下本项目看看有什么问题没有'
    },
    {
        name: 'Codex委托普通输入（应提取input并触发优化）',
        input: JSON.stringify({
            hook_event_name: 'UserPromptSubmit',
            prompt: '<codex_delegation>\n  <source_thread_id>source</source_thread_id>\n  <input>帮我写一句话说明：HookPrompt 普通用户输入测试。</input>\n</codex_delegation>'
        }),
        expectOptimization: true,
        expectContains: '帮我写一句话说明：HookPrompt 普通用户输入测试。',
        expectNotContains: '<codex_delegation>'
    },
    {
        name: 'Codex委托内部目标续跑（应跳过优化）',
        input: JSON.stringify({
            hook_event_name: 'UserPromptSubmit',
            prompt: '<codex_delegation>\n  <source_thread_id>source</source_thread_id>\n  <input>&lt;codex_internal_context source=&quot;goal&quot;&gt;\nContinue working toward the active thread goal.\n\n&lt;objective&gt;\n继续处理课程正文\n&lt;/objective&gt;\n&lt;/codex_internal_context&gt;</input>\n</codex_delegation>'
        }),
        expectOptimization: false
    },
    {
        name: 'Markdown标题输入（应安全包裹，避免渲染成标题）',
        input: JSON.stringify({
            hook_event_name: 'UserPromptSubmit',
            prompt: '# Files mentioned by the user:\n\n## codex-clipboard.png: C:/Users/example/AppData/Local/Temp/codex-clipboard.png\n\n## My request for Codex:\n帮我检查为什么输出变成标题格式'
        }),
        expectOptimization: true,
        expectContains: '## 用户原始输入（已安全包裹，请从代码块中读取原文）',
        expectNotContains: [
            '第一行必须是：📝 **原始输入**：# Files mentioned by the user:'
        ],
        expectAllContains: [
            '<MANDATORY_FORMAT_INSTRUCTION>',
            '【回复格式说明】',
            '你是一个提示词优化层',
            'Outcome-contract first',
            '<success_criteria>',
            '<verification_plan>',
            '📝 **原始输入**',
            '🔄 **优化后的理解**',
            '✅ **优化后的完整提示词**',
            '```text\n# Files mentioned by the user:',
            '请只在本轮第一条回复开头展示对用户输入的理解'
        ]
    },
    {
        name: '显式compact模式（仅应急时缩短后台契约）',
        input: JSON.stringify({
            hook_event_name: 'UserPromptSubmit',
            prompt: '# Files mentioned by the user:\n\n## codex-clipboard.png: C:/Users/example/AppData/Local/Temp/codex-clipboard.png\n\n## My request for Codex:\n帮我检查为什么输出变成标题格式'
        }),
        env: {
            HOOKPROMPT_COMPACT_CONTEXT: '1'
        },
        expectOptimization: true,
        expectContains: '已解包用户原始输入',
        expectNotContains: [
            '你是一个提示词优化层',
            'Outcome-contract first',
            '## 用户原始输入（已安全包裹，请从代码块中读取原文）'
        ],
        expectMaxContextLength: 2600,
        expectAllContains: [
            '<MANDATORY_FORMAT_INSTRUCTION compact="true">',
            '📝 **原始输入**',
            '🔄 **优化后的理解**',
            '✅ **优化后的完整提示词**',
            '```text\n# Files mentioned by the user:',
            '只在本轮第一条可见回复展示一次三段式',
            'outcome-contract',
            '保持后台 hook 输出简短'
        ]
    }
];

const hookTargets = [
    {
        name: 'Claude hook',
        path: path.join(__dirname, '.claude', 'hooks', 'user-prompt-submit.js')
    },
    {
        name: 'Codex hook',
        path: path.join(__dirname, '.codex', 'hooks', 'user-prompt-submit.js')
    }
];

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function runConfiguredCommand(command, args, cwd, input, shell = false) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            cwd,
            shell,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: process.env
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        child.on('close', (code) => resolve({ code, stdout, stderr }));
        child.stdin.end(input);
    });
}

function hasOptimizedContext(result) {
    if (result.code !== 0) return false;
    try {
        const output = JSON.parse(result.stdout);
        return Boolean(output.hookSpecificOutput?.additionalContext);
    } catch {
        return false;
    }
}

async function runCwdPathTests() {
    const nestedCwd = path.join(__dirname, 'docs');
    const input = JSON.stringify({
        hook_event_name: 'UserPromptSubmit',
        prompt: '帮我检查这个路径问题'
    });
    const expectedClaudeArg = '${CLAUDE_PROJECT_DIR}/.claude/hooks/user-prompt-submit.js';
    const claudeConfigFiles = [
        '.claude/settings.json',
        '.claude/settings.json.example-windows',
        '.claude/settings.json.example-unix'
    ];
    const claudeHandlers = claudeConfigFiles.map((relativePath) => {
        const config = JSON.parse(fs.readFileSync(path.join(__dirname, relativePath), 'utf8'));
        return config.hooks.UserPromptSubmit[0].hooks[0];
    });
    const claudeContractOk = claudeHandlers.every((handler) => (
        handler.command === 'node' &&
        handler.args?.length === 1 &&
        handler.args[0] === expectedClaudeArg
    ));
    const claudeArg = claudeHandlers[0].args[0].replace('${CLAUDE_PROJECT_DIR}', __dirname);
    const claudeRun = await runConfiguredCommand('node', [claudeArg], nestedCwd, input);

    const codexConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '.codex', 'hooks.json'), 'utf8'));
    const codexHandler = codexConfig.hooks.UserPromptSubmit[0].hooks[0];
    const codexContractOk = !codexHandler.command.includes('node .codex/hooks/user-prompt-submit.js');
    const codexRun = await runConfiguredCommand(codexHandler.command, [], nestedCwd, input, true);

    return [
        {
            name: 'Claude 配置 / 从 docs 子目录触发',
            passed: claudeContractOk && hasOptimizedContext(claudeRun),
            error: claudeContractOk
                ? (hasOptimizedContext(claudeRun) ? undefined : claudeRun.stderr || '未返回优化上下文')
                : 'Claude 配置未统一使用 CLAUDE_PROJECT_DIR'
        },
        {
            name: 'Codex 配置 / 从 docs 子目录触发',
            passed: codexContractOk && hasOptimizedContext(codexRun),
            error: codexContractOk
                ? (hasOptimizedContext(codexRun) ? undefined : codexRun.stderr || '未返回优化上下文')
                : 'Codex 配置仍使用会随 CWD 漂移的直接相对路径'
        }
    ];
}

// 运行单个测试
function runTest(testCase, hookTarget) {
    return new Promise((resolve) => {
        log(`\n${'='.repeat(60)}`, 'cyan');
        log(`测试: ${hookTarget.name} / ${testCase.name}`, 'blue');
        log(`输入: "${testCase.input}"`, 'blue');
        log('='.repeat(60), 'cyan');

        const hookPath = hookTarget.path;

        // 检查hook文件是否存在
        if (!fs.existsSync(hookPath)) {
            log(`❌ Hook文件不存在: ${hookPath}`, 'red');
            resolve({ passed: false, error: 'Hook文件不存在' });
            return;
        }

        const hookProcess = spawn('node', [hookPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                ...(testCase.env || {})
            }
        });

        let stdout = '';
        let stderr = '';

        hookProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        hookProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        hookProcess.on('close', (code) => {
            log(`\n进程退出码: ${code}`, code === 0 ? 'green' : 'red');

            if (stderr) {
                log(`\nStderr输出:`, 'yellow');
                console.log(stderr);
            }

            if (stdout) {
                log(`\nStdout输出:`, 'yellow');
                console.log(stdout.substring(0, 500)); // 只显示前500字符
                if (stdout.length > 500) {
                    log(`... (输出已截断，总长度: ${stdout.length})`, 'yellow');
                }
            }

            // 验证输出
            let result = { passed: false };

            try {
                const jsonOutput = JSON.parse(stdout);
                const hasOptimization = jsonOutput.hookSpecificOutput &&
                                      jsonOutput.hookSpecificOutput.additionalContext;

                if (testCase.expectOptimization) {
                    if (hasOptimization) {
                        const context = jsonOutput.hookSpecificOutput.additionalContext;
                        const forbiddenItems = Array.isArray(testCase.expectNotContains)
                            ? testCase.expectNotContains
                            : (testCase.expectNotContains ? [testCase.expectNotContains] : []);

                        if (testCase.expectContains && !context.includes(testCase.expectContains)) {
                            log(`\n❌ 测试失败：优化内容没有包含预期文本`, 'red');
                            result.error = `缺少: ${testCase.expectContains}`;
                        } else if (forbiddenItems.some((item) => context.includes(item))) {
                            const found = forbiddenItems.filter((item) => context.includes(item));
                            log(`\n❌ 测试失败：优化内容包含了不应出现的原始JSON字段`, 'red');
                            result.error = `不应包含: ${found.join(', ')}`;
                        } else if (
                            testCase.expectAllContains &&
                            testCase.expectAllContains.some((item) => !context.includes(item))
                        ) {
                            const missing = testCase.expectAllContains.filter((item) => !context.includes(item));
                            log(`\n❌ 测试失败：优化内容没有包含全部预期文本`, 'red');
                            result.error = `缺少: ${missing.join(', ')}`;
                        } else if (
                            testCase.expectMaxContextLength &&
                            context.length > testCase.expectMaxContextLength
                        ) {
                            log(`\n❌ 测试失败：additionalContext 过长`, 'red');
                            result.error = `长度 ${context.length} > ${testCase.expectMaxContextLength}`;
                        } else {
                            log(`\n✅ 测试通过：正确触发了优化`, 'green');
                            result.passed = true;
                        }
                    } else {
                        log(`\n❌ 测试失败：应该触发优化但没有`, 'red');
                        result.error = '应该触发优化但返回了空对象';
                    }
                } else {
                    if (!hasOptimization) {
                        log(`\n✅ 测试通过：正确跳过了优化`, 'green');
                        result.passed = true;
                    } else {
                        log(`\n❌ 测试失败：不应该触发优化但触发了`, 'red');
                        result.error = '不应该触发优化但返回了优化内容';
                    }
                }
            } catch (e) {
                log(`\n❌ 测试失败：输出不是有效的JSON`, 'red');
                result.error = `JSON解析错误: ${e.message}`;
            }

            resolve(result);
        });

        // 发送输入
        hookProcess.stdin.write(testCase.input);
        hookProcess.stdin.end();
    });
}

// 主函数
async function main() {
    log('\n' + '='.repeat(60), 'cyan');
    log('提示词优化Hook测试工具', 'cyan');
    log('='.repeat(60), 'cyan');

    const results = [];

    for (const testCase of testCases) {
        for (const hookTarget of hookTargets) {
            const result = await runTest(testCase, hookTarget);
            results.push({ name: `${hookTarget.name} / ${testCase.name}`, ...result });

            // 等待一下，避免日志混乱
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    log(`\n${'='.repeat(60)}`, 'cyan');
    log('配置路径回归测试', 'cyan');
    log('='.repeat(60), 'cyan');
    const cwdPathResults = await runCwdPathTests();
    cwdPathResults.forEach((result) => {
        log(`${result.passed ? '✅' : '❌'} ${result.name}`, result.passed ? 'green' : 'red');
        if (result.error) log(`   错误: ${result.error}`, 'yellow');
    });
    results.push(...cwdPathResults);

    // 输出总结
    log('\n' + '='.repeat(60), 'cyan');
    log('测试总结', 'cyan');
    log('='.repeat(60), 'cyan');

    results.forEach((result, index) => {
        const status = result.passed ? '✅ 通过' : '❌ 失败';
        const color = result.passed ? 'green' : 'red';
        log(`${index + 1}. ${result.name}: ${status}`, color);
        if (result.error) {
            log(`   错误: ${result.error}`, 'yellow');
        }
    });

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    log(`\n总计: ${passedCount}/${totalCount} 通过`, passedCount === totalCount ? 'green' : 'red');
    if (passedCount !== totalCount) {
        process.exitCode = 1;
    }

    // 检查日志文件
    const os = require('os');
    const logFile = path.join(os.tmpdir(), 'hook-prompt-optimizer.log');
    if (fs.existsSync(logFile)) {
        log(`\n日志文件位置: ${logFile}`, 'blue');
        log('查看日志: cat "' + logFile + '"', 'blue');
    }

    log('', 'reset');
}

main().catch(err => {
    log(`\n致命错误: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
});
