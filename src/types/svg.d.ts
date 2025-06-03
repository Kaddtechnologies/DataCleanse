declare module "*.svg" {
  /**
   * When importing SVG files with
   *   import logo from "@/assets/images/logo.svg";
   * the imported value resolves to the URL string
   * of the optimized asset that Next.js emits at build time.
   */
  const src: string;
  export default src;
}