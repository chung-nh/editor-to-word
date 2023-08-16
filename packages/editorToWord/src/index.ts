import {
  CustomTagStyleMap,
  HTMLString,
  IExportDoc,
  IExportOption,
  Node,
} from './types';
import { D_Layout, D_TagStyleMap } from './default';
import { Document, Footer, Header, Packer, Paragraph } from 'docx';

import { isFilledArray, trimHtml, calcMargin } from './utils';
import { tableNodeToITableOptions } from './builder/table';

import JSZip from 'jszip';
import { parse } from 'html-to-ast';
import { saveAs } from 'file-saver';
import { contentBuilder } from './builder';

export const getInnerTextNode = (node: Node) => {
  let inner = node;
  while (inner && inner.children && inner.children.length === 1) {
    inner = inner.children[0];
  }
  return inner;
};

// recursion chain style
export const chainStyle = (
  nodeList: Node[],
  style: string[] = [],
  tagStyleMap: CustomTagStyleMap = D_TagStyleMap
) => {
  if (!nodeList || !isFilledArray(nodeList)) return;

  nodeList.forEach((node) => {
    const { attrs, children, name } = node;
    let STYLE: string[] =
      typeof attrs?.style === 'string' ? [attrs.style, ...style] : style;

    const shape = name ? [name, ...STYLE] : [...STYLE];
    node.shape = shape;

    if (isFilledArray(children)) {
      chainStyle(children, shape, tagStyleMap);
    }
  });
};

// style builder
export const StyleBuilder = (
  list: Node[],
  tagStyleMap: CustomTagStyleMap = D_TagStyleMap
) => {
  const nList = [...list];
  chainStyle(nList, [], tagStyleMap);
  return nList;
};

// element creator
export const ElementCreator = async (
  astList: Node[],
  tagStyleMap: CustomTagStyleMap = D_TagStyleMap
): Promise<Paragraph[]> => {
  if (!astList || astList.length === 0) return [];
  const tags = StyleBuilder(
    astList.filter((n: Node) => n.type === 'tag'),
    tagStyleMap
  );
  if (!tags) return [];

  const ps: Paragraph[] = [];
  for (let node of tags) {
    const p = await contentBuilder(node, tagStyleMap);
    if (p) {
      ps.push(p as Paragraph);
    }
  }
  console.log('ps12222', ps)
  // const ps = tags
  //   .map((node: Node) => {
  //     return contentBuilder(node, tagStyleMap);
  //   })
  //   .filter(Boolean);
  return [...ps] as Paragraph[];
};

// parse html string into Node list
export const htmlToAST = (html: string): Node[] => {
  return parse(html) as Node[];
};

// generate Document
export const genDocument = async (
  html: HTMLString,
  options?: IExportOption
) => {
  const layoutOp = options?.layout || {};
  const layout = { ...D_Layout, ...layoutOp };

  const styleMap = options?.tagStyleMap || D_TagStyleMap;

  const ast: Node[] = htmlToAST(html);

  console.log('ast', ast)

  const paragraphs = await ElementCreator(ast, styleMap);
  console.log('paragraphs', paragraphs)

  const {
    orientation,
    topMargin,
    leftMargin,
    rightMargin,
    bottomMargin,
    header,
    footer,
  } = layout;

  const margin = {
    top: calcMargin(topMargin),
    left: calcMargin(leftMargin),
    right: calcMargin(rightMargin),
    bottom: calcMargin(bottomMargin),
  };

  const page = {
    margin,
    size: {
      orientation,
    },
  };

  const section = {
    properties: {
      page,
    },
    children: paragraphs,
    headers: {},
    footers: {},
  };

  if (header) {
    const ast = parse(header) as Node[];
    console.log('header', ast)

    section.headers = {
      default: new Header({
        children: await ElementCreator(ast, styleMap),
      }),
    };
  }

  if (footer) {
    const ast = parse(footer) as Node[];
    section.footers = {
      default: new Footer({
        children: await ElementCreator(ast, styleMap),
      }),
    };
  }

  const doc = new Document({
    styles: {
      paragraphStyles: [],
    },
    sections: [section],
  });
  return doc;
};

// export html as docx file
export const exportAsDocx = async (doc: Document, docName = '') => {
  Packer.toBlob(doc).then((blob) => {
    saveAs(blob, `${docName}.docx`);
  });
};

// html -> docx
export const exportHtmlToDocx = async (
  html: HTMLString,
  docName = 'doc',
  options?: IExportOption
) => {
  console.log('exportHtmlToDocx')
  const doc = await genDocument(trimHtml(html), options);
  exportAsDocx(doc, docName);
  return doc;
};

// export multi files as .zip
export const exportMultiDocsAsZip = async (
  docList: IExportDoc[],
  fileName = 'docs',
  export_option?: IExportOption
) => {
  const zip = new JSZip();
  const len = docList.length;
  if (len === 1) {
    const d = docList[0];
    const { html, name, option } = d;
    const file = await genDocument(trimHtml(html), option || export_option);
    exportAsDocx(file, name);
    return;
  }
  for (let docFile of docList) {
    const { html, name, option } = docFile;
    const doc = await genDocument(trimHtml(html), option || export_option);
    const file = await Packer.toBlob(doc);
    zip.file(`${name}.docx`, file);
  }

  zip.generateAsync({ type: 'blob' }).then((content) => {
    saveAs(content, `${fileName}.zip`);
  });
};

export const exportAsZip = exportMultiDocsAsZip;

export { IExportDoc, IExportOption };

export { parse, tableNodeToITableOptions, D_Layout, D_TagStyleMap };
