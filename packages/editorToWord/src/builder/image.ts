import { ImageRun } from 'docx';
import { Node } from '../types';
import { getImageBlob } from '../utils';
import { calcTextRunStyle } from './text';


// create docx table from table node
export const imageCreator = async (
  imageNode: Node) => {
  console.log('imageCreator', imageNode);

  const { attrs, shape } = imageNode;
  const { src, width = 100, height = 100 } = attrs;
  const styleOp = calcTextRunStyle(shape);
  if (src) {
    try {
      const imgBlob = await getImageBlob(String(src));
      console.log('imgBlob', imgBlob)
      const image = new ImageRun({
        data: imgBlob as unknown as ArrayBuffer,
        transformation: {
          width: styleOp.tWidth || Number(width),
          height: styleOp.tHeight || Number(height),
        },
      });
      return image;
    } catch (e) {
      console.log('download image error', e);
    }
  }
  return null;
};
