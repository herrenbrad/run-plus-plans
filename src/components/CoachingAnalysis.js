import React from 'react';
import ReactMarkdown from 'react-markdown';
import './CoachingAnalysis.css';

/**
 * CoachingAnalysis - Renders AI coach's markdown-formatted analysis
 */
function CoachingAnalysis({ rawResponse }) {
    if (!rawResponse) return null;

    return (
        <div className="coaching-analysis-wrapper">
            <div className="coaching-header">
                <h2>Coach's Analysis</h2>
            </div>
            <div className="coaching-content">
                <ReactMarkdown
                    components={{
                        blockquote: ({ children }) => (
                            <div className="info-box">
                                {children}
                            </div>
                        ),
                        p: ({ children }) => <p className="coaching-p">{children}</p>,
                        h1: ({ children }) => <h1 className="coaching-h1">{children}</h1>,
                        h2: ({ children }) => <h2 className="coaching-h2">{children}</h2>,
                        h3: ({ children }) => <h3 className="coaching-h3">{children}</h3>,
                        ul: ({ children }) => <ul className="coaching-ul">{children}</ul>,
                        ol: ({ children }) => <ol className="coaching-ol">{children}</ol>,
                        strong: ({ children }) => <strong className="coaching-strong">{children}</strong>,
                    }}
                >
                    {rawResponse}
                </ReactMarkdown>
            </div>
        </div>
    );
}

export default CoachingAnalysis;
