import { TYPE_CONTAINS, TYPE_IS_PART_OF, TYPE_RELATED } from '../const';
import { LinksByType } from './document';

export { groupLinksByType as groupLinksByType, LinksByType, getDocumentDisplayName } from './document';

export const getLocalStorageObject = (key) => {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) {
    return null;
  }

  const item = JSON.parse(itemStr);
  const now = new Date();

  if (now.getTime() > item.expiry) {
    localStorage.removeItem(key);
    return null;
  }
  return item.value;
};

export const setLocalStorageObject = (key, value, ttl) => {
  const now = new Date();

  const item = {
    value: value,
    expiry: now.getTime() + ttl,
  };
  localStorage.setItem(key, JSON.stringify(item));
};

export const getTopicsToDisplayOrderdByLinkType = (linksByType: LinksByType, isNestedInRelated: boolean) => {
  const linkTypesExcludedInNesting = [TYPE_CONTAINS];
  const linkTypesExcludedWhenNestingRelatedTo = [TYPE_RELATED, TYPE_IS_PART_OF, TYPE_CONTAINS];
  return Object.entries(linksByType)
    .filter(([type, _]) => !linkTypesExcludedInNesting.includes(type))
    .filter(([type, _]) =>
      isNestedInRelated ? !linkTypesExcludedWhenNestingRelatedTo.includes(type) : true
    );
};
