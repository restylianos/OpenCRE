import './documentNode.scss';

import axios from 'axios';
import React, { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { CRE, TYPE_IS_PART_OF, TYPE_RELATED } from '../../const';
import { useEnvironment } from '../../hooks';
import { applyFilters } from '../../hooks/applyFilters';
import { Document } from '../../types';
import { getDocumentDisplayName, getTopicsToDisplayOrderdByLinkType, groupLinksByType } from '../../utils';
import { getApiEndpoint, getDocumentTypeText, getInternalUrl } from '../../utils/document';
import { FilterButton } from '../FilterButton/FilterButton';
import HyperLinkIcon from '../hyper-links/hyper-link-icon/HyperLinkIcon';
import Hyperlink from '../hyper-links/hyper-link/HyperLink';
import { LoadingAndErrorIndicator } from '../LoadingAndErrorIndicator';

const MAX_LENGTH_FOR_AUTO_EXPAND = 5;

export interface DocumentNode {
  node: Document;
  linkType: string;
  hasLinktypeRelatedParent?: boolean;
}

const linkTypesToNest = [TYPE_IS_PART_OF, TYPE_RELATED];

export const DocumentNode: FunctionComponent<DocumentNode> = ({
  node,
  linkType,
  hasLinktypeRelatedParent,
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const active = useMemo(() => (expanded ? ' active' : ''), [expanded]);
  const isStandard = node.doctype in ['Tool', 'Code', 'Standard'];
  const { apiUrl } = useEnvironment();
  const [nestedNode, setNestedNode] = useState<Document>();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const id = isStandard ? node.name : node.id;
  var usedNode = applyFilters(nestedNode || node);
  const linksByType = useMemo(() => groupLinksByType(usedNode), [usedNode]);
  const { pathname } = useLocation();

  const isCrePath = useMemo(() => location.pathname.includes(CRE), [pathname]);

  const isNestedInRelated = hasLinktypeRelatedParent || linkType === TYPE_RELATED;

  const hasActiveLinks = getTopicsToDisplayOrderdByLinkType(linksByType, isNestedInRelated).length > 0;

  const topicsToDisplay = useMemo(() => {
    return getTopicsToDisplayOrderdByLinkType(linksByType, isNestedInRelated).map(([type, links]) => ({
      links,
      type,
    }));
  }, [linksByType, isNestedInRelated]);

  useEffect(() => {
    const isAllowedToAutoExpandByLength =
      topicsToDisplay.map(({ links }) => links).reduce((prev, cur) => prev.concat(cur), []).length <=
      MAX_LENGTH_FOR_AUTO_EXPAND;

    setExpanded(isCrePath ? isAllowedToAutoExpandByLength : false);
    return () => {};
  }, [topicsToDisplay, isCrePath]);

  useEffect(() => {
    if (!isStandard && linkTypesToNest.includes(linkType)) {
      setLoading(true);
      axios
        .get(getApiEndpoint(node, apiUrl))
        .then(function (response) {
          setLoading(false);
          setNestedNode(response.data.data);
          setError('');
        })
        .catch(function (axiosError) {
          setLoading(false);
          setError(axiosError);
        });
    }
  }, [id]);

  const SimpleView = () => {
    return (
      <>
        <div className={`title external-link document-node f2`}>
          <Link to={getInternalUrl(usedNode)}>
            <i aria-hidden="true" className="circle icon"></i>
            {getDocumentDisplayName(usedNode)}
          </Link>
          <HyperLinkIcon hyperLink={usedNode.hyperlink} />
        </div>
        <div className={`content`}></div>
      </>
    );
  };

  const NestedView = () => {
    return (
      <>
        <LoadingAndErrorIndicator loading={loading} error={error} />
        <div className={`title ${active} document-node`} onClick={() => setExpanded(!expanded)}>
          <i aria-hidden="true" className="dropdown icon"></i>
          <Link to={getInternalUrl(usedNode)}>{getDocumentDisplayName(usedNode)}</Link>
        </div>
        <div className={`content${active} document-node`}>
          <Hyperlink hyperLink={usedNode.hyperlink} />
          {expanded &&
            topicsToDisplay.map(({ type, links }, idx) => {
              const sortedResults = [...links].sort((a, b) =>
                getDocumentDisplayName(a.document).localeCompare(getDocumentDisplayName(b.document))
              );
              let lastDocumentName = sortedResults[0].document.name;

              return (
                <div className="document-node__link-type-container" key={`${type}-${idx}`}>
                  {idx > 0 && <hr style={{ borderColor: 'transparent', margin: '20px 0' }} />}
                  <div>
                    <b>Which {getDocumentTypeText(type, links[0].document.doctype, node.doctype)}</b>:
                    {/* Risk here of mixed doctype in here causing odd output */}
                  </div>
                  <div>
                    <div className="accordion ui fluid styled f0">
                      {sortedResults.map((link, i) => {
                        const temp = (
                          <div key={`document-node-container-${type}-${idx}-${i}`}>
                            {lastDocumentName !== link.document.name && <span style={{ margin: '5px' }} />}
                            <DocumentNode
                              node={link.document}
                              linkType={type}
                              hasLinktypeRelatedParent={isNestedInRelated}
                              key={`document-sub-node-${type}-${idx}-${i}`}
                            />
                            <FilterButton document={link.document} />
                          </div>
                        );
                        lastDocumentName = link.document.name;
                        return temp;
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          {/* <FilterButton/> */}
        </div>
      </>
    );
  };

  return hasActiveLinks ? <NestedView /> : <SimpleView />;
};
