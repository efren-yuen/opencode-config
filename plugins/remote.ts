import { execSync } from "child_process"
import path from "path"
import os from "os"
import { writeFileSync } from "fs"
import { z } from "zod"

type SessionState = {
  host: string
  socketPath: string
}

const sessionMap = new Map<string, SessionState>()

function sock(host: string) {
  return path.join(os.homedir(), ".ssh", `cm-${host}`)
}

function ensureSentinel(): string {
  const p = path.join(os.tmpdir(), "__opencode_remote_mode__")
  try {
    writeFileSync(
      p,
      "This tool is not available in remote SSH mode.\nUse the bash tool with cat/tee/grep/find over SSH instead.\n",
    )
  } catch {}
  return p
}

let sentinel: string

export default {
  id: "opencode-ssh",
  server: async () => {
    sentinel ??= ensureSentinel()

    return {
      tool: {
        ssh_connect: {
          description:
            "Open a persistent SSH connection to a remote server. Call this when the user says 'ssh <host>' or asks to connect to a server. The host must be defined in ~/.ssh/config.",
          args: {
            host: {
              type: "string",
              description: "SSH host name from ~/.ssh/config, e.g. 'myHost'",
            },
          },
          async execute(args, ctx) {
            const host = args.host
            const socketPath = sock(host)

            const existing = sessionMap.get(ctx.sessionID)
            if (existing) {
              try {
                execSync(`ssh -O stop -S "${existing.socketPath}" "${existing.host}"`, { stdio: "pipe" })
              } catch {}
            }

            try {
              execSync(`ssh -MNf -S "${socketPath}" "${host}" 2>&1`, { stdio: "pipe", timeout: 15000 })
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e)
              return `Failed to connect to ${host}: ${msg}`
            }

            sessionMap.set(ctx.sessionID, { host, socketPath })

            return {
              title: `Connected to ${host}`,
              output: [
                `SSH connection to **${host}** established. All bash commands will now run remotely.`,
                `Use bash with \cat\c, \tee\c, \grep\c, \find\c for file operations.`,
                `Say "local" to disconnect.`,
              ].join("\n"),
            }
          },
        },

        ssh_disconnect: {
          description: "Close the persistent SSH connection and return to local mode. Call this when the user says 'local' or asks to disconnect.",
          args: {},
          async execute(_args, ctx) {
            const state = sessionMap.get(ctx.sessionID)
            if (!state) return "Not currently connected."

            try {
              execSync(`ssh -O stop -S "${state.socketPath}" "${state.host}"`, { stdio: "pipe" })
            } catch {}
            sessionMap.delete(ctx.sessionID)

            return "Disconnected. Commands now run locally."
          },
        },
      },

      "tool.execute.before": async (input, output) => {
        const state = sessionMap.get(input.sessionID)
        if (!state) return

        if (input.tool === "bash") {
          const cmd = output.args.command
          if (cmd.startsWith(`ssh -S "${state.socketPath}"`)) return
          output.args.command = `ssh -S "${state.socketPath}" "${state.host}" ${cmd}`
          if (output.args.description) {
            output.args.description = `[remote ${state.host}] ${output.args.description}`
          }
          return
        }

        if (input.tool === "read") {
          output.args.filePath = sentinel
          output.args.offset = undefined
          output.args.limit = undefined
          return
        }

        if (input.tool === "write") {
          output.args.filePath = path.join(os.tmpdir(), `__opencode_remote_write__`)
          output.args.content = "This tool is not available in remote mode."
          return
        }

        if (input.tool === "edit") {
          output.args.filePath = sentinel
          output.args.oldString = "SENTINEL_MARKER_THAT_WILL_NEVER_EXIST"
          output.args.newString = ""
          output.args.replaceAll = false
          return
        }

        if (input.tool === "glob") {
          output.args.pattern = `__OPECODE_REMOTE_GLOB_UNAVAILABLE__`
          output.args.path = "/tmp"
          return
        }

        if (input.tool === "grep") {
          output.args.pattern = `^__OPECODE_REMOTE_GREP_UNAVAILABLE__$`
          output.args.path = "/tmp"
          output.args.include = undefined
          return
        }
      },

      "experimental.chat.system.transform": async (input, output) => {
        const state = input.sessionID ? sessionMap.get(input.sessionID) : undefined
        if (!state) return

        output.system.push(
          [
            "",
            "## Remote SSH Mode",
            "",
            `You are connected to **${state.host}** via persistent SSH.`,
            "",
            "1. The **bash** tool is automatically wrapped with SSH. Do NOT add SSH yourself.",
            "2. Use bash with `cat`, `tee`, `grep`, `find` for all remote file ops.",
            "3. Native `read`/`write`/`edit`/`glob`/`grep` tools are disabled in remote mode.",
            "4. Say \"local\" to disconnect.",
          ].join("\n"),
        )
      },
    }
  },
}
