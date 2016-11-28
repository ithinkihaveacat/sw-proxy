import typescript from "rollup-plugin-typescript";

export default {
  plugins: [
    typescript({
      typescript: require("typescript"),
      include: [ "../*.ts", "**/*.ts" ]
    })
  ]
}
