// Rank visible previews the same way as the gallery: focus, selection, then proximity.
export function rankPreviews(candidates, selected, centerX, centerY) {
 return candidates.map(({index,rect,focused})=>({index,rank:focused?-2:index===selected?-1:(rect.left+rect.width/2-centerX)**2+(rect.top+rect.height/2-centerY)**2})).sort((a,b)=>a.rank-b.rank||a.index-b.index).map(c=>c.index);
}

export function previewOverlaps(rect, bounds) {
 return rect.right>bounds.left&&rect.left<bounds.right&&rect.bottom>bounds.top&&rect.top<bounds.bottom;
}
