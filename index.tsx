import React from "react";
import YAML from "yaml";
import { ZodError, ZodTypeAny, z } from "zod";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

/**
 * Thrown when the configuration is invalid.
 */
class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Thrown when an unexpected metadata field is encountered.
 */
class UnexpectedFieldError extends Error {
  unexpectedFields: string[];
  constructor(unexpectedFields: string[]) {
    super(`Unexpected metadata fields: ${unexpectedFields.join(", ")}`);
    this.name = "UnexpectedFieldError";
    this.unexpectedFields = unexpectedFields;
  }
}

/**
 * Logs an error to the console.
 *
 * @param error The error to log.
 * @param context The context in which the error occurred.
 */
function logError(error: Error, context: string) {
  const isDev = process.env.NODE_ENV !== "production";
  console.error(
    `[${new Date().toISOString()}] Error in ${context}: ${error.message}`
  );

  if (isDev && error instanceof ZodError) {
    console.error("Detailed validation issues:");
    error.issues.forEach((issue) =>
      console.error(`- Field: ${issue.path.join(".")}, Issue: ${issue.message}`)
    );
  } else if (isDev && error instanceof UnexpectedFieldError) {
    console.error(`Unexpected fields: ${error.unexpectedFields.join(", ")}`);
  }
}

/**
 * Metadata field definition.
 */
interface MetadataField {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly items?: {
    readonly type?: string;
  };
}

/**
 * Route configuration.
 */
interface RouteConfig {
  readonly name: string;
  readonly path: string;
  readonly folder: string;
  readonly metadata: readonly MetadataField[];
}

/**
 * MDX configuration.
 */
interface MDXConfig {
  readonly workDir: string;
  readonly routes: readonly RouteConfig[];
}

/**
 * The type of the metadata for each route.
 */
type ExtractMetadataType<T extends readonly RouteConfig[]> = {
  [P in T[number]["name"]]: {
    [K in Extract<
      T[number],
      { readonly name: P }
    >["metadata"][number]["name"]]: any;
  };
};

export const components = {
  h1: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    return <h1 className={cn("text-xl font-bold", className)} {...props} />;
  },

  h2: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    return <h2 className={cn("text-lg font-bold", className)} {...props} />;
  },
  h3: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    return <h3 className={cn("text-base font-bold", className)} {...props} />;
  },
  ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => {
    return <ul className={cn("ml-6", className)} {...props} />;
  },
  ol: ({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) => {
    return <ol className={cn("ml-6", className)} {...props} />;
  },
  li: ({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) => {
    return <li className={cn("ml-6", className)} {...props} />;
  },
  p: ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
    return <p className={cn("[&:not(:first-child)]:", className)} {...props} />;
  },
} as const;

/**
 * The OneMDX component.
 *
 * @param config The MDX configuration.
 * @param styled_components The styled-components object.
 * @returns The OneMDX component.
 */
export const MDXTailor = <T extends MDXConfig>({
  config,
  styled_components = components,
}: {
  config: T;
  styled_components?: any;
}) => {
  type RouteNames = T["routes"][number]["name"];
  type MetadataTypes = ExtractMetadataType<T["routes"]>;

  /**
   * The configuration schema.
   */
  const configSchema = z.object({
    workDir: z.string(),
    routes: z.array(
      z.object({
        name: z.string(),
        path: z.string(),
        folder: z.string(),
        metadata: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            required: z.boolean(),
            items: z
              .object({
                type: z.string().optional(),
              })
              .optional(),
          })
        ),
      })
    ),
  });

  /**
   * Loads the configuration from the specified file.
   *
   * @param local_config The configuration to load.
   * @returns The loaded configuration.
   */
  const loadConfig = (local_config: T) => {
    try {
      const data = local_config;
      const validatedConfig = configSchema.safeParse(data);
      if (!validatedConfig.success) {
        throw new ZodError(validatedConfig.error.issues);
      }
      return validatedConfig.data;
    } catch (error) {
      if (error instanceof Error) {
        logError(error, "loading configuration");
      }
      throw new Error("Failed to load configuration.");
    }
  };

  /**
   * Retrieves the routes defined in the configuration.
   *
   * @returns The routes defined in the configuration.
   */
  const getRoutes = () => {
    try {
      const local_config = loadConfig(config);
      if (local_config) {
        return local_config.routes;
      } else {
        throw new Error("No routes found in configuration.");
      }
    } catch (error) {
      if (error instanceof Error) {
        logError(error, "retrieving routes");
        throw error;
      }
    }
  };

  /**
   * Retrieves the metadata configuration for a specific route.
   *
   * @param route The name of the route.
   * @returns The metadata configuration for the route.
   */
  const getMetadata = (route: RouteNames): MetadataField[] => {
    try {
      const local_config = loadConfig(config);
      if (local_config) {
        const routeConfig = local_config.routes.find((r) => r.name === route);
        if (routeConfig && routeConfig.metadata) {
          return routeConfig.metadata;
        } else {
          throw new Error(`Route '${route}' not found or missing metadata.`);
        }
      } else {
        throw new Error("Configuration is missing.");
      }
    } catch (error) {
      if (error instanceof Error) {
        logError(error, `getting metadata for route ${route}`);
        throw error;
      }
    }
    return [];
  };

  /**
   * Creates a Zod schema based on the metadata configuration.
   *
   * @param metadataConfig The metadata configuration.
   * @returns A Zod schema.
   */
  const createDynamicSchema = <Metadata extends MetadataField[]>(
    metadataConfig: Metadata
  ) => {
    const schemaFields: Record<string, ZodTypeAny> = {};

    for (const field of metadataConfig) {
      let fieldType: ZodTypeAny;

      switch (field.type) {
        case "string":
          fieldType = z.string();
          break;
        case "number":
          fieldType = z.number();
          break;
        case "boolean":
          fieldType = z.boolean();
          break;
        case "date":
          fieldType = z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: "Invalid date format",
          });
          break;
        case "array":
          fieldType = z.array(z.string());
          break;
        default:
          fieldType = z.any();
      }

      schemaFields[field.name] = field.required
        ? fieldType
        : fieldType.optional();
    }

    return z.object(schemaFields);
  };

  /**
   * Retrieves the metadata and content of an MDX file.
   *
   * @param content The contents of the MDX file.
   * @param route The name of the route associated with the MDX file.
   * @returns An object containing the metadata and content of the MDX file.
   */
  const getMDXData = <Route extends RouteNames>(
    content: string,
    route: Route
  ): { metadata: MetadataTypes[Route]; content: string } | undefined => {
    const lines = content.split("---");
    if (lines.length !== 3) {
      logError(
        new ConfigError("Invalid config format."),
        `parsing metadata for route "${route}"`
      );
      return undefined;
    }

    const yamlContent = lines[1];
    content = lines[2];

    try {
      const metadataConfig = getMetadata(route);
      const dynamicSchema = createDynamicSchema(metadataConfig);
      const parsedYaml = YAML.parse(yamlContent);
      const metadata = dynamicSchema.parse(parsedYaml) as MetadataTypes[Route];
      const unexpectedFields = Object.keys(parsedYaml).filter(
        (field) =>
          !metadataConfig.some((configField) => configField.name === field)
      );

      if (unexpectedFields.length > 0) {
        throw new UnexpectedFieldError(unexpectedFields);
      }

      return { metadata, content };
    } catch (error: any) {
      logError(error, `reading MDX configuration for route "${route}"`);
      return undefined;
    }
  };

  /**
   * Parses Markdown into a string of HTML.
   *
   * @param markdown The Markdown text to parse.
   * @returns A string of HTML representing the Markdown text.
   */
  const markdownToHTML = (markdown: string): string => {
    const lines = markdown.split("\n");
    let html = "";
    let listStack: ("ul" | "ol")[] = [];

    const closeLists = (): void => {
      while (listStack.length) {
        html += listStack.pop() === "ul" ? "</ul>" : "</ol>";
      }
    };

    const parseLine = (line: string): string => {
      const trimmedLine = line.trim();

      // Correctly handling header levels with null check
      const headerMatch = trimmedLine.match(/^#+/);
      if (headerMatch) {
        closeLists();
        const headerLevel = headerMatch[0].length;
        return `<h${headerLevel}>${trimmedLine.slice(
          headerLevel + 1
        )}</h${headerLevel}>`;
      }

      if (/^\- /.test(trimmedLine)) {
        if (listStack[listStack.length - 1] !== "ul") {
          closeLists();
          listStack.push("ul");
          html += "<ul>";
        }
        return `<li>${trimmedLine.slice(2)}</li>`;
      }

      if (/^\d+\. /.test(trimmedLine)) {
        if (listStack[listStack.length - 1] !== "ol") {
          closeLists();
          listStack.push("ol");
          html += "<ol>";
        }
        return `<li>${trimmedLine.slice(trimmedLine.indexOf(".") + 2)}</li>`;
      }

      if (trimmedLine === "") {
        closeLists();
        return "";
      }

      // Additional parsers for bold, italic, links, etc., can be added here

      closeLists();
      return `<p>${trimmedLine}</p>`;
    };

    lines.forEach((line) => {
      html += parseLine(line);
    });

    closeLists(); // Close any remaining open lists
    return html;
  };

  /**
   * Parses Markdown into a list of JSX elements.
   *
   * @param markdown The Markdown text to parse.
   * @returns A list of JSX elements representing the Markdown text.
   */
  const markdownToJSX = (markdown: string): JSX.Element[] => {
    const lines = markdown.split("\n");
    let elements: JSX.Element[] = [];
    let listStack: Array<"ul" | "ol"> = [];
    let listItemIndex = 0; // New variable to keep track of list item index

    const closeLists = (): void => {
      while (listStack.length) {
        const listType = listStack.pop();
        if (listType === "ul") {
          elements.push(
            React.createElement(styled_components.ul, {
              key: `list-${elements.length}`,
            })
          );
        } else if (listType === "ol") {
          elements.push(
            React.createElement(styled_components.ol, {
              key: `list-${elements.length}`,
            })
          );
        }
      }
    };

    const parseLine = (line: string): JSX.Element | null => {
      const trimmedLine = line.trim();

      const headerMatch = trimmedLine.match(/^#+/);
      if (headerMatch) {
        closeLists();
        const headerLevel = headerMatch[0].length;
        // handle all types of headers
        if (headerLevel === 1) {
          return React.createElement(
            styled_components.h1,
            { key: `header-${elements.length}` },
            trimmedLine.slice(headerLevel + 1)
          );
        } else if (headerLevel === 2) {
          return React.createElement(
            styled_components.h2,
            { key: `header-${elements.length}` },
            trimmedLine.slice(headerLevel + 1)
          );
        } else if (headerLevel === 3) {
          return React.createElement(
            styled_components.h3,
            { key: `header-${elements.length}` },
            trimmedLine.slice(headerLevel + 1)
          );
        }
      }

      // handle unordered lists

      if (/^\- /.test(trimmedLine)) {
        if (!listStack.length || listStack[listStack.length - 1] !== "ul") {
          closeLists();
          listStack.push("ul");
        }
        return React.createElement(
          styled_components.li,
          {},
          trimmedLine.slice(2)
        );
      }

      if (/^\d+\. /.test(trimmedLine)) {
        if (!listStack.length || listStack[listStack.length - 1] !== "ol") {
          closeLists();
          listStack.push("ol");
        }
        return React.createElement(
          styled_components.li,
          {},
          trimmedLine.slice(trimmedLine.indexOf(".") + 2)
        );
      }

      if (trimmedLine === "") {
        closeLists();
        return null;
      }

      // Additional parsers for bold, italic, links, etc., can be added here

      closeLists();
      return React.createElement(styled_components.p, {}, trimmedLine);
    };

    lines.forEach((line, index) => {
      const element = parseLine(line);
      if (element) {
        if (element.type === styled_components.li) {
          // For list items, use a combination of list index and item index
          elements.push(
            React.cloneElement(element, { key: `list-item-${listItemIndex++}` })
          );
        } else {
          elements.push(React.cloneElement(element, { key: index }));
        }
      }
    });

    closeLists(); // Close any remaining open lists
    return elements;
  };

  return {
    getMDXData,
    getMetadata,
    getRoutes,
    markdownToHTML,
    markdownToJSX,
  };
};
