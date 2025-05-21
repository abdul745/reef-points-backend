import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Settings } from './entities/settings.entity';

describe('SettingsService', () => {
  let service: SettingsService;
  let repository: Repository<Settings>;

  const mockSettings = {
    id: 1,
    totalPools: 4,
    isBootstrapping: false,
    isEarlySzn: true,
    isMemeSzn: false,
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(Settings),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    repository = module.get<Repository<Settings>>(getRepositoryToken(Settings));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return existing settings if found', async () => {
      mockRepository.findOne.mockResolvedValue(mockSettings);

      const result = await service.getSettings();
      expect(result).toEqual(mockSettings);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should create and return default settings if none exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockSettings);
      mockRepository.save.mockResolvedValue(mockSettings);

      const result = await service.getSettings();
      expect(result).toEqual(mockSettings);
      expect(mockRepository.create).toHaveBeenCalledWith({
        totalPools: 0,
        isBootstrapping: false,
        isEarlySzn: false,
        isMemeSzn: false,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockSettings);
    });
  });

  describe('updateSettings', () => {
    it('should update and return the settings', async () => {
      const updatedSettings = { totalPools: 5 };
      mockRepository.findOne.mockResolvedValue(mockSettings);
      mockRepository.save.mockResolvedValue({ ...mockSettings, ...updatedSettings });

      const result = await service.updateSettings(updatedSettings);
      expect(result).toEqual({ ...mockSettings, ...updatedSettings });
      expect(mockRepository.save).toHaveBeenCalledWith({ ...mockSettings, ...updatedSettings });
    });
  });
});