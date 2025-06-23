import { RoundBoxElement, RoundBoxElementData } from './roundbox/RoundBoxElement.js';

export interface ListItemData extends RoundBoxElementData {
  content: string;
  fullContent?: string;
}

export class ListItem extends RoundBoxElement {
  private containerWidth: number = 50; // Default width, can be updated

  constructor(id: string, data: ListItemData) {
    super(id, data);
  }

  setContainerWidth(width: number): void {
    this.containerWidth = width;
  }
}