const puppeteer = require('puppeteer');
const { fields } = require('./data.json');
const axios = require('axios');
require('dotenv').config();

const EMPTY_STRING = "";

(async () => {
  const browser = await puppeteer.launch({
    headless: false
  });
  const page = await browser.newPage();
  await page.goto(process.env.PAGE_URL);

  await parseValue(fields, page);
  const res = await registerToken();

  if (res !== EMPTY_STRING) {
    const ggToken = await getCaptchaToken(res);

    await putGGToken(page, ggToken);

    const [response] = await Promise.all([
      page.waitForNavigation(),
      page.click('#lead-capture-form-btn-submit'),
    ]);
  } else {
    console.log("Can't pass Captcha!!!");
  }

  await browser.close();
})();

const parseValue = async (fields, page) => {
  await asyncForEach(fields, async (field) => {
    if (field.type === 'textbox') {
      await page.type(field.selector, field.value);
    }
  });
}

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
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

const handleResult = (res) => {
  console.log(res);
  if (res.data) {
    const body = res.data;
    if (body.status === 1) {
      return body.request;
    }
  }
  return EMPTY_STRING;
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));