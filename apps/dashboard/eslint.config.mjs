import nextConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      // Rule mới của eslint-plugin-react-hooks v7 (chuẩn bị cho React
      // Compiler) — báo lỗi cả những pattern hoàn toàn chuẩn/phổ biến trong
      // codebase này (fetch dữ liệu lúc mount rồi setState). Tắt vì đây
      // không phải bug thật, và sửa lại toàn bộ theo rule này là refactor
      // lớn ngoài phạm vi dọn lint hiện tại.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  },
];

export default eslintConfig;
