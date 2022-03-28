# mediawiki-extensions-Template

## initialize this template

1. replace all names within files
```
find . -not -path '*/.*' -type f -exec sed -i 's/template/extension-name/g' {} +
find . -not -path '*/.*' -type f -exec sed -i 's/Template/ExtensionName/g' {} +
```


1. replace all file and dir names (run twice)
```
find .  -name '*Template*' -not -path '*/.*' -exec bash -c ' mv $0 ${0/\Template/ExtensionName}' {} \;
find .  -name '*Template*' -not -path '*/.*' -exec bash -c ' mv $0 ${0/\Template/ExtensionName}' {} \;
```


