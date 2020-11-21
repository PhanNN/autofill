const EMPTY_STRING = "";

const handleResult = (res) => {
  if (res.data) {
    const body = res.data;
    console.log(body);
    if (body.status === 1) {
      return body.request;
    }
  }
  return EMPTY_STRING;
};


const delay = (ms) => new Promise(res => setTimeout(res, ms));

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

module.exports = { EMPTY_STRING, handleResult, delay, asyncForEach }