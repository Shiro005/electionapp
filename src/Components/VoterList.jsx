import React, { memo } from 'react';
import { FiEye, FiMapPin } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import TranslatedText from './TranslatedText';

const VoterList = memo(({ voters }) => {
  const navigate = useNavigate();

  // Early return with "No Results" message instead of null
  if (!Array.isArray(voters) || voters.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            <TranslatedText>No Voters Found</TranslatedText>
          </h3>
          <p className="text-gray-600">
            <TranslatedText>
              Try adjusting your search terms or filters to find what you're looking for.
            </TranslatedText>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {voters.map((voter, index) => (
        <div
          key={voter.id || index}
          onClick={() => navigate(`/voter/${voter.id}`)}
          className="bg-white shadow-sm border border-gray-100 rounded-lg p-4 hover:shadow-md hover:border-orange-200 cursor-pointer transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-base truncate">
                    {voter.name || 'N/A'}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                      Booth {voter.boothNumber || 'N/A'}
                    </span>
                    <span className="text-gray-500 text-xs">
                      ID: {voter.voterId || 'N/A'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/voter/${voter.id}`);
                  }}
                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                  title="View Details"
                >
                  <FiEye className="w-4 h-4" />
                </button>
              </div>

              {voter.pollingStationAddress && (
                <div className="flex items-start gap-2">
                  <FiMapPin className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600 leading-tight">
                    {voter.pollingStationAddress}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

VoterList.displayName = 'VoterList';

export default VoterList;