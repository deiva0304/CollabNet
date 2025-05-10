import React, { useState } from 'react';
import PropTypes from 'prop-types';

const Tabs = ({ children, defaultTab }) => {
  // Find the index of the default tab or use first tab
  const defaultIndex = defaultTab 
    ? React.Children.toArray(children).findIndex(child => child.props.id === defaultTab)
    : 0;
    
  const [activeTab, setActiveTab] = useState(defaultIndex);

  return (
    <div className="w-full">
      <div className="flex border-b border-gray-700">
        {React.Children.map(children, (child, index) => (
          <button
            key={index}
            className={`px-4 py-2 font-medium text-sm ${
              index === activeTab
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            onClick={() => setActiveTab(index)}
          >
            {child.props.title}
          </button>
        ))}
      </div>
      <div className="py-2">
        {React.Children.toArray(children)[activeTab]}
      </div>
    </div>
  );
};

const Tab = ({ children, title, id }) => {
  return <div className="tab-content">{children}</div>;
};

Tabs.propTypes = {
  children: PropTypes.node.isRequired,
  defaultTab: PropTypes.string
};

Tab.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  id: PropTypes.string
};

export { Tabs, Tab };