import { FieldAppSDK } from "@contentful/app-sdk";
import {
  IconButton,
  Note,
  Stack,
  TextInput,
  TextLink,
} from "@contentful/f36-components";
import tokens from "@contentful/f36-tokens";
import { CycleIcon, ExternalLinkIcon, CopyIcon } from "@contentful/f36-icons";
import { useSDK, useCMA } from "@contentful/react-apps-toolkit";
import { css } from "emotion";
import { useEffect, useRef, useState } from "react";
import slugify from "@sindresorhus/slugify";

const Field = () => {
  const sdk = useSDK<FieldAppSDK>();
  const cma = useCMA();
  const debounceInterval: any = useRef(false);
  const detachExternalChangeHandler: any = useRef(null);
  const isLoaded: any = useRef(false);
  const [value, setValue] = useState<string | undefined>(
    sdk.field.getValue() || ""
  );
  const locale = sdk.field.locale;
  const availableLocales = sdk.locales.available;
  const defaultLocale = sdk.locales.default;
  const isLocalized = sdk.contentType.fields.find(
    (field) => field.id === sdk.field.id
  )?.localized;

  const {
    paths,
    models,
    pathPrefix = "",
    showPathPrefix = true,
    lockWhenPublished = false,
    maintainCase = false,
    preserveLeadingUnderscore = false,
    showCopyButton = false,
    showPreviewLink = true,
    customReplacements = [],
    preserveCharacters = [],
  } = sdk.parameters.installation;

  const { showWebsiteUrl = true, showPreviewUrl = true } =
    sdk.parameters.instance;

  const slugOptions: any = {
    preserveLeadingUnderscore,
    customReplacements,
    preserveCharacters: [...preserveCharacters, "/"],
    lowercase: !maintainCase,
  };

  const localePath = paths[locale] || paths[defaultLocale];
  const pattern =
    models[sdk.ids.contentType]?.patterns?.[locale] ||
    models[sdk.ids.contentType]?.patterns?.[defaultLocale];

  const parts = pattern
    ?.split("/")
    ?.map((part: string) => part.replace(/(\[|\])/gi, "").trim());

  const fields: string[] = [];

  // Extract fields used in slug parts.
  parts?.forEach((part: string) => {
    if (part.startsWith("field:")) {
      fields.push(part.replace("field:", ""));
    }
  });

  useEffect(() => {
    sdk.window.startAutoResizer();
    const listeners: (() => void)[] = [];

    // Create a listener for each field and matching locales.
    for (const field of fields) {
      const fieldParts = field.split(":");
      const fieldName = fieldParts.length === 1 ? field : fieldParts[0];
      if (fieldName in sdk.entry.fields) {
        const locales = sdk.entry.fields[fieldName].locales;

        for (const locale of locales) {
          const listener = sdk.entry.fields[fieldName].onValueChanged(
            locale,
            () => {
              if (debounceInterval.current) {
                clearInterval(debounceInterval.current);
              }
              debounceInterval.current = setTimeout(() => {
                if (isLocalized) {
                  // Reference field may not be localized but the slug field is.
                  for (const loc of availableLocales) {
                    updateSlug(loc);
                  }
                } else {
                  updateSlug(locale);
                }
              }, 500);
            }
          );
          listeners.push(listener);
        }
      }
    }

    window.setTimeout(() => {
      isLoaded.current = true;
    }, 1000);

    // Handler for external field value changes (e.g. when multiple authors are working on the same entry).
    if (sdk.field) {
      detachExternalChangeHandler.current =
        sdk.field.onValueChanged(onExternalChange);
    }

    return () => {
      // Remove debounce interval
      if (debounceInterval.current) {
        clearInterval(debounceInterval.current);
      }

      // Remove external change listener
      if (detachExternalChangeHandler.current) {
        detachExternalChangeHandler.current();
      }

      // Remove all other listeners
      for (const listener of listeners) {
        listener?.();
      }
    };
  }, []);

  const onExternalChange = (value: string) => {
    if (isLoaded.current) {
      setValue(value);
    }
  };

  const getReferenceFieldValue = async (
    fieldName: string,
    subFieldName: string,
    locale: string
  ) => {
    const defaultLocale = sdk.locales.default;
    const referenceLocale = sdk.entry.fields[fieldName].locales.includes(locale)
      ? locale
      : defaultLocale;

    const reference = sdk.entry.fields[fieldName].getValue(referenceLocale);
    if (!reference || !reference.sys || !reference.sys.id) {
      return "";
    }

    const result = await cma.entry.get({ entryId: reference.sys.id });
    const { fields } = result;

    if (!fields) {
      return "";
    }

    if (!Object.prototype.hasOwnProperty.call(fields, subFieldName)) {
      return "";
    }

    if (Object.prototype.hasOwnProperty.call(fields[subFieldName], locale)) {
      return fields[subFieldName][locale];
    }

    if (
      Object.prototype.hasOwnProperty.call(fields[subFieldName], defaultLocale)
    ) {
      return fields[subFieldName][defaultLocale];
    }

    return "";
  };

  const isLocked = () => {
    const sys: any = sdk.entry.getSys();

    const published =
      !!sys.publishedVersion && sys.version == sys.publishedVersion + 1;
    const changed =
      !!sys.publishedVersion && sys.version >= sys.publishedVersion + 2;

    return published || changed;
  };

  const updateSlug = async (locale: string, force = false) => {
    if (
      !isLoaded.current ||
      sdk.field.locale !== locale ||
      (!force && lockWhenPublished && isLocked())
    ) {
      return;
    }

    const defaultLocale = sdk.locales.default;
    const slugParts: string[] = [];

    for (const part of parts) {
      if (part.startsWith("field:")) {
        const fieldParts = part.split(":");
        let raw = "";
        let slug = "";

        if (fieldParts.length === 2) {
          if (sdk.entry.fields[fieldParts[1]] !== undefined) {
            if (sdk.entry.fields[fieldParts[1]].locales.includes(locale)) {
              raw = sdk.entry.fields[fieldParts[1]].getValue(locale);
            } else {
              raw = sdk.entry.fields[fieldParts[1]].getValue(defaultLocale);
            }
          }
          slug = slugify(raw, slugOptions);
        } else {
          raw =
            (await getReferenceFieldValue(
              fieldParts[1],
              fieldParts[2],
              locale
            )) || "";
          slug = slugify(raw, slugOptions);
        }

        slugParts.push(slug);
      } else if (part === "locale") {
        if (localePath) {
          slugParts.push(localePath);
        }
      } else if (part === "year") {
        slugParts.push(new Date().getFullYear().toString());
      } else if (part === "month") {
        slugParts.push(
          new Date().toLocaleString(undefined, { month: "2-digit" })
        );
      } else if (part === "day") {
        slugParts.push(
          new Date().toLocaleString(undefined, { day: "2-digit" })
        );
      } else if (part === "id") {
        slugParts.push(sdk.entry.getSys().id);
      } else {
        slugParts.push(part);
      }
    }

    sdk.entry.fields[sdk.field.id].setValue(
      slugParts.join("/").replace("//", "/").replace(/\/$/, ""),
      locale
    );
  };

  const onInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value
      .split("-")
      .map((part) => slugify(part, slugOptions))
      .join("-");

    setValue(value);

    if (value) {
      await sdk.field.setValue(value);
    } else {
      await sdk.field.removeValue();
    }
  };

  if (!pattern) {
    return (
      <Note
        title="App not configured!"
        style={{ maxWidth: "800px" }}
        variant="warning"
      >
        No slug pattern found for this content type. Please add a new slug
        pattern in the app configuration.
      </Note>
    );
  }

  return (
    <Stack flexDirection="column" alignItems="flex-start">
      <TextInput.Group>
        {(showPathPrefix || showWebsiteUrl) && pathPrefix?.length > 0 && (
          <TextInput
            aria-label="Slug"
            id="slug-prefix"
            isDisabled
            value={pathPrefix}
            className={css({ fontSize: tokens.fontSizeS, maxWidth: "175px" })}
          />
        )}
        <TextInput
          aria-label="Slug"
          id={sdk.field.id}
          value={value || ""}
          onChange={onInputChange}
          isRequired
        />
        <IconButton
          variant="secondary"
          icon={<CycleIcon />}
          onClick={() => updateSlug(locale, true)}
          aria-label="Reset slug value"
        />
        {showCopyButton && (
          <IconButton
            variant="secondary"
            icon={<CopyIcon />}
            onClick={() =>
              navigator.clipboard.writeText(`${pathPrefix}/${value}`)
            }
            aria-label="Copy slug value to clipboard"
          />
        )}
      </TextInput.Group>

      {(showPreviewLink || showPreviewUrl) &&
        pathPrefix?.length > 0 &&
        value && (
          <TextLink
            href={`${pathPrefix}/${value}`}
            target="_blank"
            className={css({ fontSize: tokens.fontSizeS, marginTop: -10 })}
            icon={<ExternalLinkIcon size="tiny" />}
            alignIcon="end"
          >
            {`${pathPrefix}/${value}`}
          </TextLink>
        )}
    </Stack>
  );
};

export default Field;
