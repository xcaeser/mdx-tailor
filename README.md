# mdx-tailor 🪡✨

[![NPM Version](https://img.shields.io/npm/v/mdx-tailor.svg)](https://www.npmjs.com/package/mdx-tailor)
[![License](https://img.shields.io/npm/l/mdx-tailor.svg)](https://www.npmjs.com/package/mdx-tailor)

`mdx-tailor` is a fully typed Markdown to JSX transformer library, designed to empower developers to style Markdown content with custom MDX components 🎨 and bring it to life as React components. With type inference and flexible configuration, `mdx-tailor` enables a seamless developer experience 🚀.

Works best with Next.js and other React frameworks.

## Features 🌟

- **Fully Typed**: Leverage TypeScript for strong typing throughout the library.
- **Configurable**: Easily define your Markdown transformation rules and styles with a comprehensive configuration object.
- **Type Inference for Configurations**: No need for verbose type annotations—enjoy automatic type inference for your configurations.
- **Custom Styling (using TailwindCSS)**: Define styled components for your Markdown elements, providing endless creative possibilities.

## Installation 💾

Install `mdx-tailor` using npm:

```bash
npm install mdx-tailor
```

Or with bun:

```bash
bun install mdx-tailor
```

## Usage 🛠️

Import your custom styled components and the `mdxTailor` function, along with your configuration:

```js
import { MDXTailor } from "mdx-tailor";
import components from "./path-to-your-styled-components";
import mdxConfig from "./path-to-your-mdx-config";

const mdx = MDXTailor({ config: mdxConfig, styled_components: components });
```

Use the `getMDXData` method to transform and retrieve your Markdown content as valued JSX elements:

```jsx
function MyMarkdownComponent() {
  const markdownContent = `
  ---
  title: Amazing Title
  author: John Doe
  ---

  ## Subheading

  - List
  - Of
  - Items
  `;

  const data = mdx.getMDXData(markdownContent, "toolkit");

  // Now render your Markdown content as JSX!
  return (
    <div>
      {data && (
        <>
          <h1>{data.metadata.title}</h1>
          <h2>{data.metadata.author}</h2>
          {mdx.markdownToJSX(data.content)}
        </>
      )}
    </div>
  );
}
```

## Custom Styled Components ✒️

You can define your own styled components to control how each Markdown element looks. For example:

```jsx
import { cn } from "@/lib/utils";

export const components = {
  h1: (props) => <h1 {...props} className={cn("text-xl font-bold", props.className)} />,
  h2: (props) => <h2 {...props} className={cn("text-lg text-red-500 font-bold", props.className)} />,
  // Add more custom styled components...
};

export default components;
```

Now you can import these components and use them with `mdx-tailor` to render your markdown content with custom styles.

## Configuration :gear:

Define your MDX configurations for robust document structure and metadata typing. Below is an example configuration:

```js
const mdxConfig = {
  workDir: "/src/server/mdx",
  // Define your routes with associated metadata
  routes: [
    {
      name: "toolkit",
      path: "/toolkit",
      folder: "/cheatsheet",
      // Define metadata fields for the route
      metadata: [
        { name: "author", type: "string", required: true },
        // ...additional metadata fields
      ],
    },
    // ...additional routes
  ],
};

export default mdxConfig;
```

By utilizing TypeScript, `mdx-tailor` automatically infers the types for provided configurations, ensuring your metadata aligns with the expected types and structure.

## Contributing 🤝

We welcome contributions of all kinds — whether you're fixing bugs, adding new features, or improving documentation. Your contributions are invaluable to the community.

## License 📜

`mdx-tailor` is open-sourced software licensed under the MIT license.

## Contact 📧

Made with ❤️ by - [@xcaeser](https://github.com/xcaeser)

Project Link: [https://github.com/xcaeser/mdx-tailor](https://github.com/xcaeser/mdx-tailor)