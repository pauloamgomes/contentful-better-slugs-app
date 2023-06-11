import { ConfigAppSDK } from "@contentful/app-sdk";
import { FormControl, Select, TextLink } from "@contentful/f36-components";
import { useCMA, useSDK } from "@contentful/react-apps-toolkit";
import { useEffect, useState } from "react";

interface ISlugFieldsDropdownProps {
  model: string;
  activeSlugField?: string;
  onChange: (field: string) => void;
}

export default function SlugFieldsDropdown({
  model,
  activeSlugField = "",
  onChange,
}: ISlugFieldsDropdownProps) {
  const sdk = useSDK<ConfigAppSDK>();
  const cma = useCMA();
  const [loading, setLoading] = useState<boolean>(true);
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchFields = async () => {
      const contentModel = await cma.contentType.get({ contentTypeId: model });
      const fields = contentModel.fields
        .filter((field) => field.type === "Symbol" || field.type === "Text")
        .reduce((acc: Record<string, string>, field) => {
          acc[field.id] = field.name;
          return acc;
        }, {});

      setFields(fields as any);
      setLoading(false);
    };

    fetchFields();
  }, [model]);

  return (
    <FormControl>
      <FormControl.Label isRequired>Select Slug Field</FormControl.Label>
      <Select
        id="addSlugField"
        name="addSlugField"
        isRequired
        onChange={(e) => onChange(e.target.value)}
        value={activeSlugField}
      >
        <Select.Option value="" isDisabled>
          {loading ? "Loading fields..." : "Please select an option..."}
        </Select.Option>
        {Object.keys(fields).map((key) => (
          <Select.Option key={key} value={key}>
            {fields[key]}
          </Select.Option>
        ))}
      </Select>
      <FormControl.HelpText>
        If you don't have yet a slug field{" "}
        <TextLink
          href={`https://app.contentful.com/spaces/${sdk.ids.space}/content_types/${model}/fields`}
          target="_blank"
        >
          create a new one here!
        </TextLink>
        !
      </FormControl.HelpText>
      {Object.keys(fields).length === 0 && !loading ? (
        <FormControl.ValidationMessage>
          You need to have a Text or Symbol field in your content model to be
          used as a slug.
        </FormControl.ValidationMessage>
      ) : null}
    </FormControl>
  );
}
