import { Test, TestingModule } from '@nestjs/testing';
import { PointsService } from './points.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserPoints } from './entities/user-points.entity';
import { SettingsService } from 'src/settings/settings.service';

describe('PointsService', () => {
  let service: PointsService;
  let pointsRepository: jest.Mocked<Repository<UserPoints>>;
  let settingsService: jest.Mocked<SettingsService>;

  const mockPointsRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockSettingsService = {
    getSettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        {
          provide: getRepositoryToken(UserPoints),
          useValue: mockPointsRepository,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    service = module.get<PointsService>(PointsService);
    pointsRepository = module.get(getRepositoryToken(UserPoints));
    settingsService = module.get(SettingsService);
  });



  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });


describe('calculateReferralPoints', () => {
  it('should calculate 10% for referrer and 5% for referee bonus', () => {
    const result = service.calculateReferralPoints(1000);
    expect(result).toEqual({ referrerPoints: 100, refereeBonus: 50 });
  });

  it('should return 0 for both referrer and referee bonus when referee points are 0', () => {
    const result = service.calculateReferralPoints(0);
    expect(result).toEqual({ referrerPoints: 0, refereeBonus: 0 });
  });
});

describe('updatePoints', () => {
  it('should update points for an existing user', async () => {
    const mockUser = { 
      userAddress: '0x123', 
      points: 100,
      poolType: 'default',
      currentBalance: 0,
      lowestBalance: 0,
      depositDate: new Date()
    };
    pointsRepository.findOne.mockResolvedValue(mockUser);
    pointsRepository.save.mockResolvedValue({ ...mockUser, points: 200 });

    await service.updatePoints('0x123', 100);

    expect(pointsRepository.findOne).toHaveBeenCalledWith({ where: { userAddress: '0x123' } });
    expect(pointsRepository.save).toHaveBeenCalledWith({ ...mockUser, points: 200 });
  });

  it('should create a new user if user does not exist', async () => {
    pointsRepository.findOne.mockResolvedValue(null);

    // The minimal required fields for UserPoints are: userAddress, points, poolType, currentBalance, lowestBalance, depositDate, poolAddress, date
    const now = new Date();
    const mockUser = {
      userAddress: '0x123',
      points: 100,
      poolType: 'default',
      currentBalance: 0,
      lowestBalance: 0,
      depositDate: now,
      poolAddress: '0xpool', // mock value
      date: now,
    };

    pointsRepository.create.mockReturnValue(mockUser);
    pointsRepository.save.mockRe solvedValue(mockUser);

    await service.updatePoints('0x123', 100);

    expect(pointsRepository.create).toHaveBeenCalledWith({ userAddress: '0x123', points: 100 });
    expect(pointsRepository.save).toHaveBeenCalledWith(mockUser);
  });
      actionPoints: 0,
      poolType: 'default',
      currentBalance: 0,
      lowestBalance: 0,
      depositDate: new Date()
    });

    await service.updatePoints('0x123', 100);

    expect(pointsRepository.create).toHaveBeenCalledWith({ userAddress: '0x123', points: 100 });
    expect(pointsRepository.save).toHaveBeenCalledWith({ userAddress: '0x123', points: 100 });
  });
});


describe('calculateLiquidityPoints', () => {
  it('should calculate liquidity points based on pool type and multipliers', async () => {
      const mockUser = { 
      userAddress: '0x123', 
      points: 100,
      poolType: 'default',
      currentBalance: 0,
      lowestBalance: 0,
      depositDate: new Date()
    };
    const mockSettings = { id: 1, totalPools: 0, isBootstrapping: true, isEarlySzn: true, isMemeSzn: false };

    pointsRepository.findOne.mockResolvedValue(mockUser);
    settingsService.getSettings.mockResolvedValue(mockSettings);

    const result = await service.calculateLiquidityPoints('0x123', 'volatile/stable', 100, 3);

    expect(pointsRepository.findOne).toHaveBeenCalledWith({ where: { userAddress: '0x123' } });
    expect(settingsService.getSettings).toHaveBeenCalled();
    expect(result).toBeGreaterThan(0); // Replace with the exact expected value if needed
  });

  it('should throw an error if user is not found', async () => {
    pointsRepository.findOne.mockResolvedValue(null);

    await expect(service.calculateLiquidityPoints('0x123', 'volatile/stable', 100, 3)).rejects.toThrow(
      'User not found or depositDate is null',
    );
  });
});

describe('resetLowestBalances', () => {
  it('should carry over current balance as the new lowest balance', async () => {
    const mockUsers = [
 { 
      userAddress: '0x123', 
      points: 100,
      poolType: 'default',
      currentBalance: 0,
      lowestBalance: 0,
      depositDate: new Date()
    },
  { 
      userAddress: '0x123', 
      points: 100,
      poolType: 'default',
      currentBalance: 0,
      lowestBalance: 0,
      depositDate: new Date()
    },
    ];

    pointsRepository.find.mockResolvedValue(mockUsers);

    await service.resetLowestBalances();

    expect(pointsRepository.find).toHaveBeenCalled();
    expect(pointsRepository.save).toHaveBeenCalledTimes(mockUsers.length);
    expect(pointsRepository.save).toHaveBeenCalledWith({ ...mockUsers[0], lowestBalance: 100 });
    expect(pointsRepository.save).toHaveBeenCalledWith({ ...mockUsers[1], lowestBalance: 200 });
  });
});

// describe('updateReferralPoints', () => {
//   it('should update referrer and referee points correctly', async () => {
//     const mockReferrer = { 
//       userAddress: '0xReferrer', 
//       points: 100,
//       poolType: 'default',
//       currentBalance: 0,
//       lowestBalance: 0,
//       depositDate: new Date()
//     };
//     const mockReferee = { 
//       userAddress: '0xReferee', 
//       points: 200,
//       poolType: 'default',
//       currentBalance: 0,
//       lowestBalance: 0,
//       depositDate: new Date()
//     };

//     pointsRepository.findOne.mockImplementation((query: any) => {
//       if (query.where.userAddress === '0xReferrer') return Promise.resolve(mockReferrer);
//       if (query.where.userAddress === '0xReferee') return Promise.resolve(mockReferee);
//       return Promise.resolve(null);
//     });

//     pointsRepository.save.mockImplementation((entity) => Promise.resolve(entity));

//     await service.updateReferralPoints('0xReferrer', '0xReferee', 1000);

//     expect(pointsRepository.findOne).toHaveBeenCalledWith({ where: { userAddress: '0xReferrer' } });
//     expect(pointsRepository.findOne).toHaveBeenCalledWith({ where: { userAddress: '0xReferee' } });
//     expect(pointsRepository.save).toHaveBeenCalledTimes(2);
//     expect(pointsRepository.save).toHaveBeenCalledWith({ ...mockReferrer, points: 200 });
//     expect(pointsRepository.save).toHaveBeenCalledWith({ ...mockReferee, points: 250 });
//   });
// });

});