import typescript from "rollup-plugin-typescript";

export default {
  plugins: [
    typescript({
      // Use locally-installed (newer) Typescript
      typescript: require("typescript"),
      // Search parent directory for *.ts
      include: [ "../*.ts", "**/*.ts" ]
    })
  ]
}
