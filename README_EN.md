# Kim Service

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README_EN.md">English</a>
</p>

**An independent professional-capability dependency repository maintained by Lao Jin (KimYx0207).**

It contains discoverable, independently usable, and verifiable Hooks, Skills, Tools, and professional Agents, with the same package convention reserved for future qualified Apps. Kim Service does not act as a cross-component Router, task state machine, or final acceptance brain.

## What's included

- Human-facing package directories: [hooks](hooks), [skills](skills), [tools](tools), and [industry roles (Chinese)](agents/README.md).
- Release inventory and provenance facts: [catalog.json](catalog.json).
- Generated Capability index: [generated/capabilities.json](generated/capabilities.json).
- Compose bounded task-delivery specialists: [delivery guide](docs/task-agent-delivery.md) and [reference-source audit](docs/task-agent-reference-audit.md) (Chinese).

The component table is not duplicated manually in this README. Root automation discovers package-level `capability.json` files and regenerates the indexes so the README, catalog, and package tree cannot silently drift apart.

## How to use

1. Choose a package from the generated index or its type directory.
2. Follow the package `entrypoint`; common entrypoints are `README.md` for Hooks and Tools, `SKILL.md` for Skills, or `AGENT.md` for Agents.
3. Follow the project instructions to install it for a project or your personal environment.

Use the selected component directory in Kim_Service as the current installation source. The `source` and `revision` fields in `catalog.json` record import provenance, not the latest installation address. Included packages do not require cloning their former standalone repositories. If the same capability is already present locally, check its source and version before reusing or upgrading one entrypoint to avoid duplicate installations.

Each project includes its own usage guide, license, attribution, and change history. See [GitHub Releases](https://github.com/KimYx0207/Kim_Service/releases) for the latest collection release and [CHANGELOG.md](CHANGELOG.md) for the current update notes.

## Contact and support

<p align="center">
  <img src="docs/images/contact-qr.png" alt="Contact Lao Jin" width="720">
</p>

<table align="center">
  <tr>
    <th align="center">WeChat Pay</th>
    <th align="center">Alipay</th>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/wechat-pay.jpg" alt="WeChat Pay QR code" width="260"></td>
    <td align="center"><img src="docs/images/alipay.jpg" alt="Alipay QR code" width="260"></td>
  </tr>
</table>

If these open-source projects help you, please consider starring, sharing, or buying Lao Jin a coffee.

## Open-source note

Repository-level Kim Service material uses the MIT License. Each capability package has independently authoritative license and provenance records; adapted or migrated packages are governed by their `LICENSE`, `PROVENANCE`, or equivalent files.
