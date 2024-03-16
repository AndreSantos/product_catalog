import Tesseract from 'tesseract.js';

export async function readPhoto(item) {
    const result = await Tesseract.recognize(
        item.photos[0],
        'eng',
        { logger: m => {} }
    );
    return result.data.text;
    // .then(({ data: { text } }) => {
    //     console.log(text);
    // })
    
    // return await download.image({
    //     url: item.photos[id],
    //     dest: `${process.env.PWD}/tmp/${item.id}-${id}.jpeg` 
    // });
}