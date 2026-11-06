import type {Locale} from '../config/site';
import {getContent} from '../content';
import {pageDocument} from './layout';
import {escapeHtml} from './html';
import {visionTemplate} from './vision-template';
// @ts-expect-error Shared approved view translations are JavaScript.
import {translate} from '../vision/i18n.mjs';
export function renderVision(locale:Locale):string {
 const main=visionTemplate.replace(/\{\{(\w+)\}\}/g,(_,key)=>escapeHtml(translate(locale,key)));
 return pageDocument(locale,'vision',getContent(locale),main,['/assets/vision.js'],
  {title:translate(locale,'title'),description:translate(locale,'notice')},['/assets/maplibre.css','/assets/vision.css']);
}
