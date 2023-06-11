import { FormControl, Select } from "@contentful/f36-components";
import { useCMA } from "@contentful/react-apps-toolkit";
import { useEffect, useState } from "react";

interface IContentModelsDropdown {
  activeModel?: string;
  configuredModels?: Record<string, {}>;
  onChange: (model: string) => void;
}

export default function ContentModelsDropdown({
  activeModel = "",
  configuredModels = {},
  onChange,
}: IContentModelsDropdown) {
  const cma = useCMA();
  const [models, setModels] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchModels = async () => {
      const contentModels = await cma.contentType.getMany({ limit: 1000 });
      const contentModelsDefaults = contentModels.items.reduce(
        (acc: Record<string, string>, item) => {
          acc[item.sys.id] = item.name;
          return acc;
        },
        {}
      );

      setModels(contentModelsDefaults);
    };

    fetchModels();
  }, []);

  return (
    <FormControl>
      <FormControl.Label isRequired>Select Content Model</FormControl.Label>
      <Select
        id="addContentModel"
        name="addContentModel"
        isRequired
        value={activeModel}
        onChange={(e) => onChange(e.target.value)}
      >
        <Select.Option value="" isDisabled>
          Please select an option...
        </Select.Option>
        {Object.keys(models)
          .filter((key) => !configuredModels?.[key])
          .map((key) => (
            <Select.Option key={key} value={key}>
              {models[key]}
            </Select.Option>
          ))}
      </Select>
    </FormControl>
  );
}
