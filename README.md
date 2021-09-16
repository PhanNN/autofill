# autofill
Package using selenium to fill form and submit (with Google Captcha passing)

## Env
* **CAPTCHA_API_KEY** - Captchar api key (get from **2captcha.com**)
* **PAGE_URL** - url that contains form need to submit
* **GOOGLE_KEY** - Google captchar key (get from page)

## Endpoint
**POST** {{url}}/process

## Input format (JSON)
```
{
    "fields": [
    {
        "type": "textbox",
        "selector": "#deformField1",
        "value": "John"
    },
    {
        "type": "checkbox",
        "selector": "#deformField4",
        "value": "[\"Individual\", \"Fund\"]"
    }]
}
```

## Supported types
* **textbox**: for selection, textbox, radio button
* **checkbox**: checkbox
* Will support more ...

## My tasks
- [x] Finish project
- [ ] Support more input types
- [ ] Support more Captchar methods
- [ ] Extract, build auto submit module and publish as node module (not depend on server api code)
