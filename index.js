const puppeteer = require('puppeteer');
// const { fields } = require('./data.json');
const axios = require('axios');
const Hapi = require('@hapi/hapi');
require('dotenv').config();
const { EMPTY_STRING, handleResult, delay, asyncForEach } = require('./util.js');

const init = async () => {

  const server = Hapi.server({
    port: 8080,
    host: '0.0.0.0'
  });

  server.route({
    method: 'POST',
    path: '/process',
    handler: async (request, h) => {
      if (request.payload) {
        await handleMsg(request.payload.fields);
        return 'OK';
      }
      return 'Check payload and submit again.'
    }
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();

const handleMsg = async (fields) => {
  console.time("starting");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  console.log('getting browser')
  const page = await browser.newPage();
  console.log('got browser1')

  await page.goto(process.env.PAGE_URL);
  console.log('navigated')
  await parseValue(fields, page);
  console.log('parsed values')
  const res = await registerToken();
  console.log('got register token')

  if (res !== EMPTY_STRING) {
    delay(10000);
    console.log('getting captcha token')
    const ggToken = await getCaptchaToken(res);
    console.log('before put token')
    await putGGToken(page, ggToken);
    console.log('after put token')

    try {
      //let wait = page.waitForNavigation({ timeout: 10000 });
      await page.click('#lead-capture-form-btn-submit');
      
    } catch (e) {
      // tricky
      console.error(e);
    }

  } else {
    console.log("Can't pass Captcha!!!");
  }

  console.timeEnd("msg")
  browser.close();
}

const parseValue = async (fields, page) => {
  await asyncForEach(fields, async (field) => {
    switch (field.type) {
      case 'textbox':
        await page.type(field.selector, field.value);
      break;
      case 'checkbox':
        await parseCheckbox(page, field.selector.substring(1), field.value);
      break;
      default:
      break;
    }
  });
}

const parseCheckbox = async (page, idPrefix, values) => {
  const elements = await page.$$(`input[id^="${idPrefix}"]`);
  await asyncForEach(elements, async (ele) => {
    
    const elParent = (await ele.$x('..'))[0];
    const text = await page.evaluate(elParent => elParent.textContent, elParent);
    const json = JSON.parse(values);
    if (json.includes(text.trim())) {
      await page.evaluate(element => {
          return element.click();
      }, ele);
    }
  });
}

const putGGToken = async (page, token) => {
  await page.evaluate(() => {
    const cssText = document.querySelector('#g-recaptcha-response').style.cssText;
    document.querySelector('#g-recaptcha-response').style.cssText = cssText.replace('display: none', '');
  });
  await page.type('#g-recaptcha-response', token);
}

const registerToken = async () => {
  try {
    console.log('BEGIN REGISTER TOKEN');
    const res = await axios.post(`https://2captcha.com/in.php?json=1&key=${process.env.CAPTCHA_API_KEY}&method=userrecaptcha&googlekey=${process.env.GOOGLE_KEY}&pageurl=${process.env.PAGE_URL}`);

    return await handleResult(res);
  } catch (error) {
    console.log('REGISTER TOKEN - HAS ERROR');
    console.log(error)
  }
  return EMPTY_STRING;
}

const getCaptchaToken = async (id) => {
  try {
    console.log('BEGIN GET TOKEN');
    const res = await axios.get(`https://2captcha.com/res.php?json=1&key=${process.env.CAPTCHA_API_KEY}&action=get&id=${id}`);

    const token = await handleResult(res);
    if (token !== EMPTY_STRING) {
      return token;
    }

    await delay(5000);

    return await getCaptchaToken(id);
  } catch (error) {
    console.log(error)
  }
  return EMPTY_STRING;
}
