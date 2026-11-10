# 需求与验收证据追踪

把每个交付义务与来源、实现位置和实际验收记录连接，及时暴露遗漏、过期证据与局部阻断。

## 使用

复制完整目录后，让当前宿主读取 `SKILL.md`，提供 `capability.json` 声明的输入。方法、模板和作者反例随包携带；工具权限由宿主绑定。

## 交付

- 需求到实现和验证的双向矩阵。
- 逐项证据适用判定。
- 变更影响与失效记录。
- 接受材料与未决事项。
- 当前输入、来源、期间单位及证据缺口。
- 未执行、未观察、方法假设和外推边界。
- 当前产物、规则结果、证据定位与待解决事项交调用方。

## 验证与范围

运行 `node tests/contract.test.mjs` 检查独立包完整性。规则需结合真实产物和独立评审执行；本包保持 `needs_probe` 和 `professionalEffect: not_evaluated`。

## 联系与支持

<p align="center">
  <img src="../../docs/images/contact-qr.png" alt="老金联系方式" width="720">
</p>

<table align="center">
  <tr>
    <th align="center">微信收款码</th>
    <th align="center">支付宝收款码</th>
  </tr>
  <tr>
    <td align="center"><img src="../../docs/images/wechat-pay.jpg" alt="微信收款码" width="260"></td>
    <td align="center"><img src="../../docs/images/alipay.jpg" alt="支付宝收款码" width="260"></td>
  </tr>
</table>

如果这个能力包帮到了你，欢迎 Star、分享，或者请老金喝杯咖啡。图片统一维护在仓库公共目录；单独复制本包不影响方法运行，联系与支持可访问 [Kim Service](https://github.com/KimYx0207/Kim_Service#联系与支持)。
