import {
  Flex,
  IconButton,
  Spinner,
  Stack,
  Text,
} from "@contentful/f36-components";
import { CopyIcon } from "@contentful/f36-icons";
import { useCMA } from "@contentful/react-apps-toolkit";

import { css } from "emotion";
import { useEffect, useState } from "react";

const defaultTokens = {
  year: "[year]",
  month: "[month]",
  day: "[day]",
  id: "[id]",
  locale: "[locale]",
};

const AvailableTokens = ({
  name,
  activeSlugField,
  onClick,
}: {
  name: string;
  activeSlugField: string;
  onClick: (token: string) => void;
}) => {
  const cma = useCMA();
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const getLinkModelValidTokenFields = async (linkModelName: string) => {
    const validFields: string[] = [];
    const contentModel = await cma.contentType.get({
      contentTypeId: linkModelName,
    });

    contentModel.fields.forEach((field) => {
      switch (field.type) {
        case "Date":
        case "Symbol":
          validFields.push(field.id);
      }
    });

    return validFields;
  };

  useEffect(() => {
    const fetchModel = async () => {
      const newTokens: Record<string, string> = {};
      const contentModel = await cma.contentType.get({ contentTypeId: name });
      const fields = contentModel.fields.filter(
        (field) => field.id !== activeSlugField
      );

      for (const field of fields) {
        switch (field.type) {
          case "Date":
          case "Symbol":
            newTokens[field.id] = `[field:${field.id}]`;
            break;
          case "Link":
            if (
              field.linkType === "Entry" &&
              field.validations?.length === 1 &&
              field.validations[0]?.linkContentType?.[0]
            ) {
              const validFields = await getLinkModelValidTokenFields(
                field.validations[0].linkContentType[0]
              );

              validFields.forEach((linkField) => {
                newTokens[
                  `${field.id}${linkField}`
                ] = `[field:${field.id}:${linkField}]`;
              });
            }
        }
      }

      setTokens({ ...defaultTokens, ...newTokens });
      setLoading(false);
    };

    fetchModel();
  }, []);

  if (loading) {
    return (
      <Flex paddingBottom="spacingL">
        <Text marginRight="spacingXs">Loading...</Text>
        <Spinner />
      </Flex>
    );
  }

  return (
    <Stack
      alignItems="center"
      flexWrap="wrap"
      marginBottom="spacingL"
      className={css({ gap: "0.375rem" })}
    >
      {Object.keys(tokens).map((key) => (
        <IconButton
          key={key}
          size="small"
          variant="secondary"
          aria-label="Copy Token"
          icon={<CopyIcon size="small" />}
          className={css({ maxWidth: "420px", fontSize: "12px" })}
          onClick={() => {
            navigator.clipboard.writeText(tokens[key]);
            onClick(tokens[key]);
          }}
        >
          {tokens[key]}
        </IconButton>
      ))}
    </Stack>
  );
};

export const insertToken = (slug: string, token: string, position: number) =>
  `${slug.slice(0, position)}${token}${slug.slice(position)}`;

export default AvailableTokens;
