# Adds GG Gains' Swift files and entitlements to the generated Xcode project.
require 'xcodeproj'
proj = Xcodeproj::Project.open('ios/App/App.xcodeproj')
target = proj.targets.find { |t| t.name == 'App' }
synced = proj.objects.any? { |o| o.isa == 'PBXFileSystemSynchronizedRootGroup' }
group = proj.main_group.find_subpath('App', false) || proj.main_group
unless synced
  %w[GGNativePlugin.swift GGViewController.swift].each do |f|
    next if group.files.any? { |x| x.path == f }
    ref = group.new_reference(f)
    target.add_file_references([ref])
  end
  group.new_reference('App.entitlements') unless group.files.any? { |x| x.path == 'App.entitlements' }
end
target.build_configurations.each do |c|
  c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements'
end
proj.save
puts "Added files (synchronized groups: #{synced})"
