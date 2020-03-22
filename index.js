const puppeteer = require('puppeteer');
const { fields } = require('./data.json');
const axios = require('axios');
const Hapi = require('@hapi/hapi');
require('dotenv').config();
const { EMPTY_STRING, handleResult, delay, asyncForEach } = require('./util.js');

const init = async () => {

  const server = Hapi.server({
    port: 3000,
    host: 'localhost'
  });

  server.route({
    method: 'POST',
    path: '/process',
    handler: (request, h) => {
      handleMsg();
      return 'Running';
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

const handleMsg = async () => {
  const browser = await puppeteer.launch({
    headless: false
  });
  const page = await browser.newPage();
  await page.goto(process.env.PAGE_URL);

  await parseValue(fields, page);
  const res = await registerToken();

  if (res !== EMPTY_STRING) {
    delay(10000);

    const ggToken = await getCaptchaToken(res);

    await putGGToken(page, ggToken);

    try {
      let wait = page.waitForNavigation({ timeout: 5000 });
      await page.click('#lead-capture-form-btn-submit');
      await wait;
    } catch (e) {
      // tricky
      console.error(e);
    }

  } else {
    console.log("Can't pass Captcha!!!");
  }

  browser.close();
}

const parseValue = async (fields, page) => {
  await asyncForEach(fields, async (field) => {
    if (field.type === 'textbox') {
      await page.type(field.selector, field.value);
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
    const res = await axios.post(`https://2captcha.com/in.php?json=1&key=${process.env.CAPTCHA_API_KEY}&method=userrecaptcha&googlekey=${process.env.GOOGLE_KEY}&pageurl=${process.env.PAGE_URL}`);

    return await handleResult(res);
  } catch (error) {
    console.error(error)
  }
  return EMPTY_STRING;
}

const getCaptchaToken = async (id) => {
  try {
    const res = await axios.get(`https://2captcha.com/res.php?json=1&key=${process.env.CAPTCHA_API_KEY}&action=get&id=${id}`);

    const token = await handleResult(res);
    if (token !== EMPTY_STRING) {
      return token;
    }

    await delay(5000);

    return await getCaptchaToken(id);
  } catch (error) {
    console.error(error)
  }
  return EMPTY_STRING;
}