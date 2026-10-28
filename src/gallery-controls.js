// Preserve native trackpad and touch input; convert a vertical mouse wheel only
// when the horizontal gallery can scroll.
export function shouldScrollGalleryWheel({row,coarse,deltaX,deltaY,scrollWidth,clientWidth}){
 return row&&!coarse&&Math.abs(deltaY)>Math.abs(deltaX)&&scrollWidth>clientWidth;
}

export function nearestGalleryCard(cards,center){
 let best=null,distance=Infinity;for(const {index,rect} of cards){const d=Math.abs(rect.left+rect.width/2-center);if(d<distance){best=index;distance=d}}return best;
}

export function galleryEdgeVelocity(x,width,zone=110,max=16){
 if(x<0||x>width)return 0;if(x<zone)return -max*(1-x/zone);if(x>width-zone)return max*(1-(width-x)/zone);return 0;
}

export function verticalGalleryNeighbor(cards,current,direction){
 const origin=cards.find(c=>c.index===current);if(!origin)return current;const center=origin.rect.left+origin.rect.width/2;let best=current,rowDistance=Infinity,columnDistance=Infinity;for(const {index,rect} of cards){const row=(rect.top-origin.rect.top)*direction;if(row<=1)continue;const column=Math.abs(rect.left+rect.width/2-center);if(row<rowDistance-1||(Math.abs(row-rowDistance)<=1&&column<columnDistance)){best=index;rowDistance=row;columnDistance=column}}return best;
}
